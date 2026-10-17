import { describe, expect, it } from "vitest";
import { WaveProvider } from "./wave.js";

describe("WaveProvider", () => {
  const provider = new WaveProvider();

  it("exposes public identity and endpoints", () => {
    expect(provider.identity.id).toBe("wave");
    expect(provider.identity.name).toBe("Wave");
    expect(provider.identity.unofficial).toBe(true);
    expect(provider.identity.countries).toContain("SN");
    expect(provider.identity.countries).toContain("CI");
    expect(provider.endpoints).toHaveLength(1);
    expect(provider.endpoints[0]?.path).toBe("/v1/checkout/sessions");
  });

  it("simulates payment_success with signed webhook", async () => {
    const outcome = await provider.simulate({
      scenario: "payment_success",
      method: "POST",
      path: "/v1/checkout/sessions",
      body: { amount: "2500", currency: "XOF", client_reference: "order-101" },
      secret: "my_test_secret",
    });

    expect(outcome.response.status).toBe(200);
    const body = outcome.response.body as Record<string, unknown>;
    expect(body.checkout_status).toBe("complete");
    expect(body.amount).toBe("2500");
    expect(outcome.webhooks).toHaveLength(1);

    const webhook = outcome.webhooks[0];
    expect(webhook?.delayMs).toBe(0);
    expect(webhook?.headers["wave-signature"]).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    const payload = webhook?.payload as Record<string, unknown>;
    expect(payload.type).toBe("checkout.session.completed");
  });

  it("simulates insufficient_funds with cancelled webhook", async () => {
    const outcome = await provider.simulate({
      scenario: "insufficient_funds",
      method: "POST",
      path: "/v1/checkout/sessions",
      body: { amount: "50000" },
    });

    expect(outcome.response.status).toBe(200);
    expect(outcome.webhooks).toHaveLength(1);
    const payload = outcome.webhooks[0]?.payload as Record<string, unknown>;
    expect(payload.type).toBe("checkout.session.cancelled");
  });

  it("simulates operator_timeout without webhooks", async () => {
    const outcome = await provider.simulate({
      scenario: "operator_timeout",
      method: "POST",
      path: "/v1/checkout/sessions",
    });

    expect(outcome.response.status).toBe(504);
    expect(outcome.webhooks).toHaveLength(0);
  });

  it("simulates duplicate_webhook with two webhooks", async () => {
    const outcome = await provider.simulate({
      scenario: "duplicate_webhook",
      method: "POST",
      path: "/v1/checkout/sessions",
    });

    expect(outcome.response.status).toBe(200);
    expect(outcome.webhooks).toHaveLength(2);
    expect(outcome.webhooks[1]?.duplicateOf).toBe(0);
    expect(outcome.webhooks[1]?.delayMs).toBeGreaterThan(0);
  });

  it("simulates delayed_webhook with positive delay", async () => {
    const outcome = await provider.simulate({
      scenario: "delayed_webhook",
      method: "POST",
      path: "/v1/checkout/sessions",
    });

    expect(outcome.response.status).toBe(200);
    expect(outcome.webhooks[0]?.delayMs).toBe(10000);
  });
});
