import { createSimulator } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../../db/client.js";
import { call } from "../../../testing-routes.js";
import { createTestApp, registerAccount } from "../../../testing.js";
import { createDeliveryWorker } from "../delivery/worker.js";
import { testProvider } from "../fixtures.js";
import { memoryBus } from "./bus.js";
import { openStream, type Stream } from "./testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let base: string;
let awa: string;
const streams: Stream[] = [];
const bus = memoryBus();

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ sandbox: { providers: [testProvider], bus } }));
  base = await app.listen({ port: 0, host: "127.0.0.1" });
  awa = await registerAccount(app, "awa@example.com");
});
afterEach(async () => {
  for (const stream of streams.splice(0)) stream.close();
  await close();
});

async function newKey() {
  const response = await call(app, "POST", "/v1/sandbox/keys", {
    cookie: awa,
    payload: { provider: "fake" },
  });
  return response.body.data as { id: string; key: string };
}

async function pay(key: string, amount = 1) {
  await app.inject({
    method: "POST",
    url: "/v1/sandbox/fake/payments",
    headers: { authorization: `Bearer ${key}` },
    payload: { amount },
  });
  const worker = createDeliveryWorker({
    db,
    simulator: createSimulator([testProvider]),
    serverSecret: "x".repeat(40),
    resolveHost: () => Promise.resolve([]),
    notifier: bus,
    now: () => new Date(),
  });
  await worker.runOnce();
}

async function listen(key: string, lastEventId?: string) {
  const stream = await openStream(base, key, lastEventId);
  streams.push(stream);
  return stream;
}

describe("GET /v1/sandbox/listen", () => {
  it("refuses an unknown key", async () => {
    const response = await fetch(`${base}/v1/sandbox/listen`, {
      headers: { authorization: "Bearer ovp_test_nope" },
    });
    expect(response.status).toBe(401);
  });

  it("switches the key to the relay and announces itself", async () => {
    const { id, key } = await newKey();
    const stream = await listen(key);
    expect(await stream.next()).toMatchObject({ event: "ready", data: { provider: "fake" } });
    const keys = (await call(app, "GET", "/v1/sandbox/keys", { cookie: awa })).body
      .data as unknown as { id: string; target: string }[];
    expect(keys.find((entry) => entry.id === id)?.target).toBe("relay");
  });

  it("streams each webhook with its raw body and headers, numbered for resumption", async () => {
    const { key } = await newKey();
    const stream = await listen(key);
    await stream.next();
    await pay(key, 42);
    const message = await stream.next();
    expect(message.event).toBe("webhook");
    expect(message.id).toMatch(/^\d+$/);
    expect(message.data).toMatchObject({
      method: "POST",
      source: "simulated",
      headers: { "content-type": "application/json" },
      eventType: "payment.paid",
    });
    expect(JSON.parse((message.data as { body: string }).body)).toMatchObject({
      payload: { body: { amount: 42 } },
    });
  });

  it("only streams the key's own webhooks", async () => {
    const mine = await newKey();
    const theirs = await newKey();
    const stream = await listen(mine.key);
    await stream.next();
    await listen(theirs.key);
    await pay(theirs.key, 7);
    await pay(mine.key, 8);
    const message = await stream.next();
    expect(JSON.parse((message.data as { body: string }).body)).toMatchObject({
      payload: { body: { amount: 8 } },
    });
  });

  it("replays what was sent while disconnected, after the last seen id", async () => {
    const { key } = await newKey();
    const first = await listen(key);
    await first.next();
    await pay(key, 1);
    const seen = await first.next();
    first.close();
    await pay(key, 2);
    const again = await listen(key, seen.id);
    await again.next();
    const missed = await again.next();
    expect(JSON.parse((missed.data as { body: string }).body)).toMatchObject({
      payload: { body: { amount: 2 } },
    });
  });

  it("limits a key to three open connections", async () => {
    const { key } = await newKey();
    for (let index = 0; index < 3; index += 1) await listen(key);
    const response = await fetch(`${base}/v1/sandbox/listen`, {
      headers: { authorization: `Bearer ${key}` },
    });
    expect(response.status).toBe(429);
  });
});

describe("delivery results and replays", () => {
  async function relayed() {
    const created = await newKey();
    const stream = await listen(created.key);
    await stream.next();
    await pay(created.key);
    const message = await stream.next();
    return { ...created, stream, deliveryId: (message.data as { deliveryId: string }).deliveryId };
  }

  const report = (key: string, deliveryId: string, payload: object) =>
    fetch(`${base}/v1/sandbox/deliveries/${deliveryId}/result`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  it("records what the local server answered", async () => {
    const { id, key, deliveryId } = await relayed();
    expect((await report(key, deliveryId, { status: 204, durationMs: 31 })).status).toBe(200);
    const events = (await call(app, "GET", `/v1/sandbox/events?keyId=${id}`, { cookie: awa })).body
      .data as unknown as { deliveries: object[] }[];
    expect(events[0]?.deliveries[0]).toMatchObject({
      status: "delivered",
      responseStatus: 204,
      durationMs: 31,
    });
  });

  it("refuses a result from another key", async () => {
    const { deliveryId } = await relayed();
    const other = await newKey();
    expect((await report(other.key, deliveryId, { status: 200, durationMs: 1 })).status).toBe(404);
  });

  it("replays a delivery for its owner only", async () => {
    const { deliveryId } = await relayed();
    const replay = await call(app, "POST", `/v1/sandbox/deliveries/${deliveryId}/replay`, {
      cookie: awa,
    });
    expect(replay.status).toBe(201);
    expect(replay.body.data).toMatchObject({ status: "scheduled", target: "relay" });
    const kofi = await registerAccount(app, "kofi@example.com");
    expect(
      (await call(app, "POST", `/v1/sandbox/deliveries/${deliveryId}/replay`, { cookie: kofi }))
        .status,
    ).toBe(404);
  });
});
