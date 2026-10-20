import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookRequest } from "./http-client.js";
import { workerHarness } from "./testing-worker.js";

const w = workerHarness();
beforeEach(w.setup);
afterEach(w.teardown);
const { worker, pay, deliveries } = w;

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
    w.time += 61_000;
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
    expect(Date.parse(retry?.dueAt ?? "") - w.time).toBe(10_000);
    for (const wait of [10_000, 60_000, 300_000, 1_800_000]) {
      w.time += wait;
      await failing.runOnce();
    }
    expect((await deliveries(keyId))[0]).toMatchObject({ status: "failed", attempts: 5 });
  });

  it("hands relay webhooks to the listeners through a notification", async () => {
    const keyId = await pay({ target: "relay" });
    await worker().runOnce();
    expect((await deliveries(keyId))[0]?.status).toBe("sent");
    expect(w.notified).toEqual([
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

  it("settles each row alone: one failing delivery does not stop the others", async () => {
    const first = await pay({ target: "relay" });
    const second = await pay({ target: "relay" });
    const notify = vi.fn().mockRejectedValueOnce(new Error("notify down"));
    const flaky = { notify: notify.mockResolvedValue(undefined) };
    const log = { error: vi.fn() };
    const run = worker(undefined, { notifier: flaky, log });
    await expect(run.runOnce()).resolves.toBe(2);
    const rows = [...(await deliveries(first)), ...(await deliveries(second))];
    expect(rows.map((d) => d.status)).toEqual(["sent", "sent"]);
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  it("fails a row that keeps crashing instead of reclaiming it forever", async () => {
    const keyId = await pay({ target: "url", webhookUrl: "https://hooks.example.com/in" });
    const send = vi.fn(() => Promise.reject(new Error("boom")));
    for (let i = 0; i < 7; i++) {
      await worker(send).runOnce();
      w.time += 61_000;
    }
    expect(send).toHaveBeenCalledTimes(5);
    expect((await deliveries(keyId))[0]).toMatchObject({ status: "failed", attempts: 6 });
  });

  it("purges sandbox history older than seven days", async () => {
    await pay({});
    await w.db.execute(sql`update sandbox_events set created_at = now() - interval '8 days'`);
    await w.db.execute(sql`update sandbox_objects set updated_at = now() - interval '8 days'`);
    w.time = Date.now();
    expect(await worker().purge()).toEqual({ events: 1, objects: 1 });
  });
});
