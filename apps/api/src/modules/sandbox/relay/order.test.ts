import { createSimulator } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../../db/client.js";
import { call } from "../../../testing-routes.js";
import { createTestApp, registerAccount } from "../../../testing.js";
import { createDeliveryWorker } from "../delivery/worker.js";
import { testProvider } from "../fixtures.js";
import { sandboxDeliveries } from "../tables.js";
import { memoryBus } from "./bus.js";
import { relayRepository } from "./repository.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
const bus = memoryBus();

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ sandbox: { providers: [testProvider], bus } }));
});
afterEach(async () => {
  await close();
});

async function relayedKey() {
  const awa = await registerAccount(app, "awa@example.com");
  const created = await call(app, "POST", "/v1/sandbox/keys", {
    cookie: awa,
    payload: { provider: "fake" },
  });
  const { id, key } = created.body.data as { id: string; key: string };
  await relayRepository(db).useRelay(id);
  return { id, key };
}

const pay = (key: string) =>
  app.inject({
    method: "POST",
    url: "/v1/sandbox/fake/payments",
    headers: { authorization: `Bearer ${key}` },
    payload: { amount: 1 },
  });

const sendDue = (at: Date) =>
  createDeliveryWorker({
    db,
    simulator: createSimulator([testProvider]),
    serverSecret: "x".repeat(40),
    resolveHost: () => Promise.resolve([]),
    notifier: bus,
    now: () => at,
  }).runOnce();

describe("relay cursor", () => {
  it("resumes after a delivery sent first without skipping one inserted earlier but sent later", async () => {
    const { id, key } = await relayedKey();
    await pay(key);
    await pay(key);
    const rows = await db.select().from(sandboxDeliveries).orderBy(sandboxDeliveries.seq);
    const [a, b] = rows;
    const later = new Date(Date.now() + 60_000);
    await db
      .update(sandboxDeliveries)
      .set({ dueAt: later })
      .where(eq(sandboxDeliveries.id, a?.id ?? ""));
    await sendDue(new Date());
    await sendDue(new Date(later.getTime() + 1000));
    const relays = relayRepository(db);
    const sentB = (await relays.awaitingFor(id, b?.id ?? ""))?.sentSeq;
    expect(sentB).toBeTypeOf("number");
    const resumed = await relays.pending(id, sentB ?? 0, new Date());
    expect(resumed.map((row) => row.id)).toEqual([a?.id]);
  });
});

describe("recording a result", () => {
  it("lets only one of two results through", async () => {
    const { id, key } = await relayedKey();
    await pay(key);
    await sendDue(new Date());
    const relays = relayRepository(db);
    const [row] = await relays.pending(id, undefined, new Date());
    const result = { status: 200, durationMs: 1 };
    const [first, second] = await Promise.all([
      relays.record(row?.id ?? "", result, new Date()),
      relays.record(row?.id ?? "", result, new Date()),
    ]);
    expect([first, second].filter((value) => value !== undefined)).toHaveLength(1);
  });
});
