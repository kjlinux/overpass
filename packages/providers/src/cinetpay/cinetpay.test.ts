import { describe, expect, it } from "vitest";
import { CinetPayProvider } from "./cinetpay.js";

describe("CinetPayProvider", () => {
  const provider = new CinetPayProvider();

  it("exposes public identity and endpoints", () => {
    expect(provider.identity.id).toBe("cinetpay");
    expect(provider.identity.name).toBe("CinetPay");
    expect(provider.identity.unofficial).toBe(true);
    expect(provider.identity.countries).toContain("CI");
    expect(provider.identity.countries).toContain("SN");
    expect(provider.endpoints).toHaveLength(1);
    expect(provider.endpoints[0]?.path).toBe("/v1/payment");
  });

  it("simulates payment_success with x-token header", async () => {
    const outcome = await provider.simulate({
      scenario: "payment_success",
      method: "POST",
      path: "/v1/payment",
      body: {
        amount: "5000",
        currency: "XOF",
        transaction_id: "tx-456",
        site_id: "999888",
      },
      secret: "cinetpay_secret",
    });

    expect(outcome.response.status).toBe(200);
    const body = outcome.response.body as Record<string, unknown>;
    expect(body.code).toBe("201");
    expect(body.status).toBe("CREATED");
    expect(outcome.webhooks).toHaveLength(1);

    const webhook = outcome.webhooks[0];
    expect(webhook?.delayMs).toBe(0);
    expect(webhook?.headers["x-token"]).toMatch(/^[a-f0-9]{64}$/);
    const payload = webhook?.payload as Record<string, unknown>;
    expect(payload.cpm_result).toBe("00");
    expect(payload.cpm_trans_status).toBe("ACCEPTED");
  });

  it("simulates insufficient_funds with refused webhook", async () => {
    const outcome = await provider.simulate({
      scenario: "insufficient_funds",
      method: "POST",
      path: "/v1/payment",
      body: { amount: "100000" },
    });

    expect(outcome.response.status).toBe(200);
    expect(outcome.webhooks).toHaveLength(1);
    const payload = outcome.webhooks[0]?.payload as Record<string, unknown>;
    expect(payload.cpm_result).toBe("602");
    expect(payload.cpm_trans_status).toBe("REFUSED");
  });

  it("simulates operator_timeout without webhooks", async () => {
    const outcome = await provider.simulate({
      scenario: "operator_timeout",
      method: "POST",
      path: "/v1/payment",
    });

    expect(outcome.response.status).toBe(504);
    expect(outcome.webhooks).toHaveLength(0);
  });

  it("simulates duplicate_webhook with two webhooks", async () => {
    const outcome = await provider.simulate({
      scenario: "duplicate_webhook",
      method: "POST",
      path: "/v1/payment",
    });

    expect(outcome.response.status).toBe(200);
    expect(outcome.webhooks).toHaveLength(2);
    expect(outcome.webhooks[1]?.duplicateOf).toBe(0);
  });

  it("simulates delayed_webhook with positive delay", async () => {
    const outcome = await provider.simulate({
      scenario: "delayed_webhook",
      method: "POST",
      path: "/v1/payment",
    });

    expect(outcome.response.status).toBe(200);
    expect(outcome.webhooks[0]?.delayMs).toBe(10000);
  });
});
