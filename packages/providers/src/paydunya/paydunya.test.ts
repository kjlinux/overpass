import { describe, expect, it } from "vitest";
import { PayDunyaProvider } from "./paydunya.js";

describe("PayDunyaProvider", () => {
  const provider = new PayDunyaProvider();

  it("exposes PayDunya identity and covered countries", () => {
    expect(provider.identity.id).toBe("paydunya");
    expect(provider.identity.countries).toContain("SN");
    expect(provider.identity.countries).toContain("CI");
    expect(provider.identity.unofficial).toBe(true);
  });

  it("simulates payment_success with invoice token and IPN webhook", async () => {
    const outcome = await provider.simulate({
      scenario: "payment_success",
      method: "POST",
      path: "/api/v1/checkout-invoice/create",
      body: { invoice: { total_amount: "5000" } },
    });

    expect(outcome.response.status).toBe(200);
    const body = outcome.response.body as Record<string, unknown>;
    expect(body.response_code).toBe("00");
    expect(body.token).toBeDefined();

    expect(outcome.webhooks).toHaveLength(1);
    const webhook = outcome.webhooks[0];
    expect(webhook?.delayMs).toBe(0);
    expect(webhook?.headers["x-paydunya-signature"]).toBeDefined();
    const payload = webhook?.payload as Record<string, unknown>;
    const data = payload.data as Record<string, unknown>;
    expect(data.status).toBe("completed");
    expect(payload.hash).toBeDefined();
  });

  it("simulates insufficient_funds with failed status in IPN", async () => {
    const outcome = await provider.simulate({
      scenario: "insufficient_funds",
      method: "POST",
      path: "/api/v1/checkout-invoice/create",
    });

    expect(outcome.response.status).toBe(200);
    expect(outcome.webhooks).toHaveLength(1);
    const payload = outcome.webhooks[0]?.payload as Record<string, unknown>;
    const data = payload.data as Record<string, unknown>;
    expect(data.status).toBe("failed");
    expect(data.fail_reason).toBe("insufficient_funds");
  });

  it("simulates operator_timeout with 504 and empty webhooks", async () => {
    const outcome = await provider.simulate({
      scenario: "operator_timeout",
      method: "POST",
      path: "/api/v1/checkout-invoice/create",
    });

    expect(outcome.response.status).toBe(504);
    expect(outcome.webhooks).toHaveLength(0);
  });

  it("simulates duplicate_webhook with second webhook referencing first", async () => {
    const outcome = await provider.simulate({
      scenario: "duplicate_webhook",
      method: "POST",
      path: "/api/v1/checkout-invoice/create",
    });

    expect(outcome.webhooks).toHaveLength(2);
    expect(outcome.webhooks[1]?.duplicateOf).toBe(0);
  });

  it("simulates delayed_webhook with 10s delay", async () => {
    const outcome = await provider.simulate({
      scenario: "delayed_webhook",
      method: "POST",
      path: "/api/v1/checkout-invoice/create",
    });

    expect(outcome.webhooks).toHaveLength(1);
    expect(outcome.webhooks[0]?.delayMs).toBe(10000);
  });
});
