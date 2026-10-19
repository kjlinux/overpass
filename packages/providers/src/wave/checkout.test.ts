import { describe, expect, it } from "vitest";
import { harness } from "../testing.js";
import { wave } from "./index.js";

const order = {
  amount: "1000",
  currency: "XOF",
  error_url: "https://example.com/error",
  success_url: "https://example.com/success",
  client_reference: "order-123",
};

type Session = Record<string, unknown> & { id: string; transaction_id: string };

async function created(scenario: Parameters<ReturnType<typeof harness>["call"]>[0]) {
  const sim = harness(wave);
  const result = await sim.call(scenario, {
    method: "POST",
    path: "/v1/checkout/sessions",
    body: order,
  });
  return { sim, result, session: result.response.body as Session };
}

describe("POST /v1/checkout/sessions", () => {
  it("returns an open session shaped like the documented object", async () => {
    const { result, session } = await created("success");
    expect(result.response.status).toBe(200);
    expect(session).toMatchObject({
      amount: "1000",
      currency: "XOF",
      checkout_status: "open",
      payment_status: "processing",
      client_reference: "order-123",
      last_payment_error: null,
      when_completed: null,
      when_created: "2026-10-14T10:00:00Z",
      when_expires: "2026-10-14T10:30:00Z",
    });
    expect(session.id).toMatch(/^cos-[a-z0-9]{1,16}$/);
    expect(session.transaction_id).toMatch(/^T_[A-Z0-9]+$/);
    expect(session.wave_launch_url).toBe(`https://overpass.test/sandbox/launch/wave/${session.id}`);
  });

  it("completes the payment and sends checkout.session.completed with the full session", async () => {
    const { sim, result, session } = await created("success");
    const [webhook] = result.webhooks;
    expect(webhook?.delayMs).toBe(0);
    expect(webhook?.event.type).toBe("checkout.session.completed");
    expect(webhook?.event.id).toMatch(/^EV_/);
    expect(webhook?.event.payload).toMatchObject({
      id: session.id,
      checkout_status: "complete",
      payment_status: "succeeded",
      when_completed: "2026-10-14T10:00:00Z",
    });
    const read = await sim.call("success", {
      method: "GET",
      path: `/v1/checkout/sessions/${session.id}`,
    });
    expect(read.response.body).toMatchObject({
      checkout_status: "complete",
      payment_status: "succeeded",
    });
  });

  it("reports insufficient funds the way the documented payment_failed webhook does", async () => {
    const { sim, result, session } = await created("insufficient_funds");
    expect(result.webhooks.map((entry) => entry.event.payload)).toEqual([
      {
        id: session.id,
        payment_status: "failed",
        checkout_status: "failed",
        last_payment_error: { code: "insufficient-funds", message: "Insufficient balance" },
      },
    ]);
    const read = await sim.call("success", {
      method: "GET",
      path: `/v1/checkout/sessions/${session.id}`,
    });
    expect(read.response.body).toMatchObject({
      checkout_status: "open",
      payment_status: "processing",
      last_payment_error: { code: "insufficient-funds" },
    });
  });

  it("lets the session expire without any webhook when the payer never pays", async () => {
    const { sim, result, session } = await created("timeout");
    expect(result.webhooks).toEqual([]);
    const read = await sim.call("success", {
      method: "GET",
      path: `/v1/checkout/sessions/${session.id}`,
    });
    expect(read.response.body).toMatchObject({
      checkout_status: "expired",
      when_completed: "2026-10-14T10:00:00Z",
    });
  });

  it("sends the same event twice for a duplicate, and late for a late webhook", async () => {
    const duplicate = (await created("duplicate_webhook")).result.webhooks;
    expect(duplicate).toHaveLength(2);
    expect(duplicate[0]?.event.id).toBe(duplicate[1]?.event.id);
    const late = (await created("late_webhook")).result.webhooks;
    expect(late[0]?.delayMs).toBeGreaterThan(0);
  });
});

describe("reading sessions", () => {
  it("answers checkout-session-not-found for an unknown id", async () => {
    const result = await harness(wave).call("success", {
      method: "GET",
      path: "/v1/checkout/sessions/cos-nope",
    });
    expect(result.response.status).toBe(404);
    expect(result.response.body).toMatchObject({ code: "checkout-session-not-found" });
  });

  it("finds a session by transaction id", async () => {
    const { sim, session } = await created("success");
    const query = { transaction_id: session.transaction_id };
    const result = await sim.call("success", {
      method: "GET",
      path: "/v1/checkout/sessions",
      query,
    });
    expect(result.response.body).toMatchObject({ id: session.id });
    const missing = await sim.call("success", {
      method: "GET",
      path: "/v1/checkout/sessions",
      query: { transaction_id: "T_NONE" },
    });
    expect(missing.response.status).toBe(404);
  });

  it("searches by client reference, with an empty result when nothing matches", async () => {
    const { sim, session } = await created("success");
    const search = (reference: string) =>
      sim.call("success", {
        method: "GET",
        path: "/v1/checkout/sessions/search",
        query: { client_reference: reference },
      });
    expect((await search("order-123")).response.body).toEqual({
      result: [expect.objectContaining({ id: session.id })],
    });
    expect((await search("other")).response.body).toEqual({ result: [] });
  });
});
