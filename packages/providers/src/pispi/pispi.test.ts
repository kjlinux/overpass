import { describe, expect, it } from "vitest";
import { PiSpiProvider } from "./pispi.js";

describe("PiSpiProvider", () => {
  const provider = new PiSpiProvider();

  it("exposes BCEAO identity and UEMOA countries", () => {
    expect(provider.identity.id).toBe("pispi");
    expect(provider.identity.countries).toHaveLength(8);
    expect(provider.identity.countries).toContain("CI");
    expect(provider.identity.countries).toContain("SN");
    expect(provider.identity.unofficial).toBe(true);
  });

  it("simulates payment_success with accepted status and completion webhook", async () => {
    const outcome = await provider.simulate({
      scenario: "payment_success",
      method: "POST",
      path: "/v1/instant-transfers",
      body: { amount: "25000", currency: "XOF" },
    });

    expect(outcome.response.status).toBe(200);
    const body = outcome.response.body as Record<string, unknown>;
    expect(body.status).toBe("ACCEPTED");
    expect(body.settlement_system).toBe("BCEAO_PI_SPI");

    expect(outcome.webhooks).toHaveLength(1);
    const webhook = outcome.webhooks[0];
    expect(webhook?.delayMs).toBe(0);
    expect(webhook?.headers["pispi-signature"]).toBeDefined();
    const payload = webhook?.payload as Record<string, unknown>;
    expect(payload.event).toBe("TRANSFER_COMPLETED");
  });

  it("simulates insufficient_funds with rejected status and failure webhook", async () => {
    const outcome = await provider.simulate({
      scenario: "insufficient_funds",
      method: "POST",
      path: "/v1/instant-transfers",
    });

    expect(outcome.response.status).toBe(200);
    const body = outcome.response.body as Record<string, unknown>;
    expect(body.status).toBe("REJECTED");

    expect(outcome.webhooks).toHaveLength(1);
    const payload = outcome.webhooks[0]?.payload as Record<string, unknown>;
    expect(payload.event).toBe("TRANSFER_FAILED");
    expect(payload.reason_code).toBe("AM04");
  });

  it("simulates operator_timeout with 504 status and empty webhooks", async () => {
    const outcome = await provider.simulate({
      scenario: "operator_timeout",
      method: "POST",
      path: "/v1/instant-transfers",
    });

    expect(outcome.response.status).toBe(504);
    expect(outcome.webhooks).toHaveLength(0);
  });

  it("simulates duplicate_webhook with an additional duplicate", async () => {
    const outcome = await provider.simulate({
      scenario: "duplicate_webhook",
      method: "POST",
      path: "/v1/instant-transfers",
    });

    expect(outcome.webhooks).toHaveLength(2);
    expect(outcome.webhooks[1]?.duplicateOf).toBe(0);
    expect(outcome.webhooks[1]?.delayMs).toBe(2000);
  });

  it("simulates delayed_webhook with 10s initial delay", async () => {
    const outcome = await provider.simulate({
      scenario: "delayed_webhook",
      method: "POST",
      path: "/v1/instant-transfers",
    });

    expect(outcome.webhooks).toHaveLength(1);
    expect(outcome.webhooks[0]?.delayMs).toBe(10000);
  });
});
