import { createSimulator } from "@overpass/simulator";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../../../db/client.js";
import { call } from "../../../testing-routes.js";
import { createTestApp, registerAccount } from "../../../testing.js";
import { testProvider } from "../fixtures.js";
import type { SendResult, WebhookRequest } from "./http-client.js";
import { createDeliveryWorker } from "./worker.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let awa: string;
let time: number;
let dns: Record<string, string[]>;
const now = () => new Date(time);
const notified: { channel: string; payload: string }[] = [];
const notifier = {
  notify: (channel: string, payload: string) =>
    Promise.resolve(void notified.push({ channel, payload })),
};

beforeEach(async () => {
  time = Date.parse("2026-10-14T10:00:00Z");
  dns = { "hooks.example.com": ["93.184.216.34"] };
  notified.length = 0;
  const resolveHost = (host: string) => Promise.resolve(dns[host] ?? []);
  ({ app, db, close } = await createTestApp({
    now,
    sandbox: { providers: [testProvider], resolveHost },
  }));
  awa = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

function worker(
  send: (request: WebhookRequest) => Promise<SendResult> = () =>
    Promise.resolve({ status: 200, durationMs: 12 }),
) {
  const resolveHost = (host: string) => Promise.resolve(dns[host] ?? []);
  const simulator = createSimulator([testProvider]);
  return createDeliveryWorker({
    db,
    simulator,
    serverSecret: "s".repeat(40),
    resolveHost,
    send,
    notifier,
    now,
  });
}

async function pay(payload: object) {
  const key = (
    await call(app, "POST", "/v1/sandbox/keys", {
      cookie: awa,
      payload: { provider: "fake", ...payload },
    })
  ).body.data as { id: string; key: string };
  await app.inject({
    method: "POST",
    url: "/v1/sandbox/fake/payments",
    headers: { authorization: `Bearer ${key.key}` },
    payload: {},
  });
  return key.id;
}

async function deliveries(keyId: string) {
  const events = (await call(app, "GET", `/v1/sandbox/events?keyId=${keyId}`, { cookie: awa })).body
    .data as unknown as {
    deliveries: {
      status: string;
      attempts: number;
      body: string;
      headers: Record<string, string>;
      responseStatus: number | null;
      dueAt: string;
    }[];
  }[];
  return events.flatMap((event) => event.deliveries);
}

describe("delivery worker", () => {
  it("files webhooks for the built-in receiver with the provider's wire format", async () => {
    const keyId = await pay({});
    expect(await worker().runOnce()).toBe(1);
    const [delivery] = await deliveries(keyId);
    expect(delivery).toMatchObject({
      status: "delivered",
      attempts: 1,
      headers: { "content-type": "application/json" },
    });
    expect(JSON.parse(delivery?.body ?? "{}")).toMatchObject({ type: "payment.paid" });
  });

  it("leaves a late webhook alone until it is due", async () => {
    const keyId = await pay({ scenario: "late_webhook" });
    expect(await worker().runOnce()).toBe(0);
    time += 61_000;
    expect(await worker().runOnce()).toBe(1);
    expect((await deliveries(keyId))[0]?.status).toBe("delivered");
  });

  it("posts to a public URL at the address checked just before sending", async () => {
    const keyId = await pay({ target: "url", webhookUrl: "https://hooks.example.com/in" });
    const send = vi.fn((request: WebhookRequest) =>
      Promise.resolve({ status: 200, durationMs: 40, request }),
    );
    await worker(send).runOnce();
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      url: "https://hooks.example.com/in",
      addresses: ["93.184.216.34"],
    });
    expect((await deliveries(keyId))[0]).toMatchObject({
      status: "delivered",
      responseStatus: 200,
    });
  });

  it("retries a failing URL with backoff, then gives up after five attempts", async () => {
    const keyId = await pay({ target: "url", webhookUrl: "https://hooks.example.com/in" });
    const failing = worker(() => Promise.resolve({ status: 500, durationMs: 5 }));
    await failing.runOnce();
    const [retry] = await deliveries(keyId);
    expect(retry).toMatchObject({ status: "scheduled", attempts: 1, responseStatus: 500 });
    expect(Date.parse(retry?.dueAt ?? "") - time).toBe(10_000);
    for (const wait of [10_000, 60_000, 300_000, 1_800_000]) {
      time += wait;
      await failing.runOnce();
    }
    expect((await deliveries(keyId))[0]).toMatchObject({ status: "failed", attempts: 5 });
  });

  it("refuses a URL whose name now resolves to a private address", async () => {
    const keyId = await pay({ target: "url", webhookUrl: "https://hooks.example.com/in" });
    dns["hooks.example.com"] = ["169.254.169.254"];
    const send = vi.fn(() => Promise.resolve({ status: 200, durationMs: 1 }));
    await worker(send).runOnce();
    expect(send).not.toHaveBeenCalled();
    expect((await deliveries(keyId))[0]).toMatchObject({ status: "failed" });
  });

  it("hands relay webhooks to the listeners through a notification", async () => {
    const keyId = await pay({ target: "relay" });
    await worker().runOnce();
    expect((await deliveries(keyId))[0]?.status).toBe("sent");
    expect(notified).toEqual([
      { channel: "sandbox_relay", payload: expect.stringContaining(keyId) as string },
    ]);
  });

  it("never hands a claimed delivery to a second worker", async () => {
    await pay({ target: "url", webhookUrl: "https://hooks.example.com/in" });
    let nested = -1;
    const second = worker();
    await worker(async () => {
      nested = await second.runOnce();
      return { status: 200, durationMs: 1 };
    }).runOnce();
    expect(nested).toBe(0);
  });

  it("purges sandbox history older than seven days", async () => {
    await pay({});
    await db.execute(sql`update sandbox_events set created_at = now() - interval '8 days'`);
    await db.execute(sql`update sandbox_objects set updated_at = now() - interval '8 days'`);
    time = Date.now();
    expect(await worker().purge()).toEqual({ events: 1, objects: 1 });
  });
});
