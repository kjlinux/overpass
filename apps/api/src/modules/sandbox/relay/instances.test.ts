import { createSimulator } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../app.js";
import type { Database } from "../../../db/client.js";
import { call } from "../../../testing-routes.js";
import { createTestApp, registerAccount } from "../../../testing.js";
import { createDeliveryWorker } from "../delivery/worker.js";
import { testProvider } from "../fixtures.js";
import { memoryBus } from "./bus.js";
import { openStream } from "./testing.js";

let first: FastifyInstance;
let second: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
const bus = memoryBus();
const sandbox = { providers: [testProvider], bus };

beforeEach(async () => {
  ({ app: first, db, close } = await createTestApp({ sandbox }));
  const config = {
    NODE_ENV: "test" as const,
    LOG_LEVEL: "silent" as const,
    TRUST_PROXY: 0,
    WEB_ORIGIN: "http://web.test",
    SESSION_SECRET: "test-secret-with-at-least-32-characters!",
  };
  second = await buildApp({ config, db, sandbox });
});
afterEach(async () => {
  await second.close();
  await close();
});

describe("several API instances", () => {
  it("streams on one instance a webhook created through another", async () => {
    const awa = await registerAccount(first, "awa@example.com");
    const created = await call(first, "POST", "/v1/sandbox/keys", {
      cookie: awa,
      payload: { provider: "fake" },
    });
    const { key } = created.body.data as { key: string };
    const stream = await openStream(await second.listen({ port: 0, host: "127.0.0.1" }), key);
    await stream.next();
    const headers = { authorization: `Bearer ${key}` };
    await first.inject({
      method: "POST",
      url: "/v1/sandbox/fake/payments",
      headers,
      payload: { amount: 5 },
    });
    const simulator = createSimulator([testProvider]);
    const deps = {
      db,
      simulator,
      serverSecret: "x".repeat(40),
      notifier: bus,
      now: () => new Date(),
    };
    await createDeliveryWorker({ ...deps, resolveHost: () => Promise.resolve([]) }).runOnce();
    expect((await stream.next()).event).toBe("webhook");
    stream.close();
  });
});
