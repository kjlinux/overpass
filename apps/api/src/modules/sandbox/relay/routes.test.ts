import { eq } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../../../db/client.js";
import { call } from "../../../testing-routes.js";
import { createTestApp, registerAccount } from "../../../testing.js";
import { testProvider } from "../fixtures.js";
import { digestKey } from "../keys.js";
import { sandboxDeliveries, sandboxKeys } from "../tables.js";
import { memoryBus } from "./bus.js";
import { createRelayHub } from "./hub.js";
import { registerRelayRoutes } from "./routes.js";
import type { RelayRouteDeps } from "./routes.js";

describe("replay limits and listen races", () => {
  let app: FastifyInstance;
  let db: Database;
  let close: () => Promise<void>;
  let base: string;
  let cookie: string;

  beforeEach(async () => {
    ({ app, db, close } = await createTestApp({
      sandbox: { providers: [testProvider], bus: memoryBus() },
    }));
    base = await app.listen({ port: 0, host: "127.0.0.1" });
    cookie = await registerAccount(app, "awa@example.com");
  });
  afterEach(async () => {
    await close();
  });

  async function newKey() {
    const response = await call(app, "POST", "/v1/sandbox/keys", {
      cookie,
      payload: { provider: "fake" },
    });
    return response.body.data as { id: string; key: string };
  }

  async function paidDelivery(key: string, keyId: string) {
    await app.inject({
      method: "POST",
      url: "/v1/sandbox/fake/payments",
      headers: { authorization: `Bearer ${key}` },
      payload: { amount: 1 },
    });
    const [row] = await db
      .select()
      .from(sandboxDeliveries)
      .where(eq(sandboxDeliveries.keyId, keyId));
    if (row === undefined) throw new Error("no delivery recorded");
    return row.id;
  }

  const replay = (id: string) =>
    call(app, "POST", `/v1/sandbox/deliveries/${id}/replay`, { cookie });

  it("answers 429 once the replay route is hit too often", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    const statuses: number[] = [];
    for (let index = 0; index < 31; index += 1) statuses.push((await replay(missing)).status);
    expect(statuses.slice(0, 30).every((status) => status === 404)).toBe(true);
    expect(statuses[30]).toBe(429);
  });

  it("counts replays against the key quota and refuses past it", async () => {
    const created = await newKey();
    const deliveryId = await paidDelivery(created.key, created.id);
    await db.update(sandboxKeys).set({ quota: 2 }).where(eq(sandboxKeys.id, created.id));
    expect((await replay(deliveryId)).status).toBe(201);
    const refused = await replay(deliveryId);
    expect(refused.status).toBe(429);
    expect(refused.body.error?.code).toBe("rate_limited");
  });

  it("never lets simultaneous listeners exceed three per key", async () => {
    const { key } = await newKey();
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () =>
        fetch(`${base}/v1/sandbox/listen`, { headers: { authorization: `Bearer ${key}` } }),
      ),
    );
    const accepted = attempts.filter((response) => response.status === 200);
    expect(accepted).toHaveLength(3);
    expect(attempts.filter((response) => response.status === 429)).toHaveLength(3);
    for (const response of accepted) await response.body?.cancel();
  });
});

describe("GET /v1/sandbox/listen when the backlog cannot be read", () => {
  it("closes the stream and releases the connection slot", async () => {
    const key = { id: "k1", provider: "fake", prefix: "ovp_test_abcd", quota: 10 };
    const bus = memoryBus();
    const relays = {
      useRelay: () => Promise.resolve(),
      pending: () => Promise.reject(new Error("database down")),
      awaitingFor: () => Promise.resolve(undefined),
    };
    const hub = createRelayHub(bus, relays as never);
    const secret = "ovp_test_" + "a".repeat(32);
    const keys = {
      findActiveByHash: (hash: string) =>
        Promise.resolve(hash === digestKey(secret) ? key : undefined),
    };
    const server = Fastify();
    registerRelayRoutes(server, {
      keys,
      relays,
      hub,
      now: () => new Date(),
    } as unknown as RelayRouteDeps);
    const base = await server.listen({ port: 0, host: "127.0.0.1" });
    const response = await fetch(`${base}/v1/sandbox/listen`, {
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(2000),
    }).catch(() => undefined);
    await response?.text().catch(() => "");
    await vi.waitFor(() => {
      expect(hub.count("k1")).toBe(0);
    });
    await server.close();
  });
});
