import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, testClock } from "../../testing-routes.js";
import type { Body } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let userCookie: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  userCookie = await registerAccount(app, "dev@example.com");
});
afterEach(() => close());

describe("POST /v1/sandbox/keys", () => {
  it("creates a test key with a quota of 100", async () => {
    const res = await call(app, "POST", "/v1/sandbox/keys", {
      cookie: userCookie,
      payload: { provider: "wave", expiresHours: 48 },
    });
    expect(res.status).toBe(201);
    const data = res.body.data as Record<string, unknown>;
    expect(data.key).toMatch(/^sbk_[a-f0-9]{64}$/);
    expect(data.provider).toBe("wave");
    expect(data.quotaRemaining).toBe(100);
    expect(data.expiresAt).toBeDefined();
  });
});

describe("POST /v1/sandbox/:provider/*", () => {
  it("runs Wave simulation and decrements quota", async () => {
    const keyRes = await call(app, "POST", "/v1/sandbox/keys", {
      payload: { provider: "wave" },
    });
    const { key } = keyRes.body.data as { key: string };

    // Inject sandbox key via raw inject for header support
    const rawSim = await app.inject({
      method: "POST",
      url: "/v1/sandbox/wave/v1/checkout/sessions",
      headers: { "x-sandbox-key": key, "content-type": "application/json" },
      payload: {
        scenario: "payment_success",
        method: "POST",
        path: "/v1/checkout/sessions",
        body: { amount: "1000", currency: "XOF" },
      },
    });

    expect(rawSim.statusCode).toBe(200);
    const body = rawSim.json<Body>();
    expect((body.data as Record<string, unknown>).outcome).toBeDefined();
    expect((body.data as Record<string, unknown>).eventId).toBeDefined();

    const eventsRes = await app.inject({
      method: "GET",
      url: "/v1/sandbox/events",
      headers: { "x-sandbox-key": key },
    });
    expect(eventsRes.statusCode).toBe(200);
    const eventsBody = eventsRes.json<Body>();
    expect(eventsBody.data).toHaveLength(1);
  });

  it("runs CinetPay simulation", async () => {
    const simRes = await app.inject({
      method: "POST",
      url: "/v1/sandbox/cinetpay/v1/payment",
      payload: {
        scenario: "payment_success",
        method: "POST",
        path: "/v1/payment",
        body: { amount: "2000", currency: "XOF" },
      },
    });

    expect(simRes.statusCode).toBe(200);
    const body = simRes.json<Body>();
    expect((body.data as Record<string, unknown>).outcome).toBeDefined();
  });

  it("blocks SSRF attempts on private webhook addresses", async () => {
    const simRes = await app.inject({
      method: "POST",
      url: "/v1/sandbox/wave/v1/checkout/sessions",
      payload: {
        scenario: "payment_success",
        method: "POST",
        path: "/v1/checkout/sessions",
        webhookUrl: "http://127.0.0.1:5000/hook",
      },
    });

    expect(simRes.statusCode).toBe(400);
    const body = simRes.json<Body>();
    expect(body.error?.code).toBe("sandbox_ssrf_blocked");
  });

  it("refuses an unknown provider", async () => {
    const simRes = await app.inject({
      method: "POST",
      url: "/v1/sandbox/unknown_provider/checkout",
      payload: {
        scenario: "payment_success",
        method: "POST",
        path: "/checkout",
      },
    });

    expect(simRes.statusCode).toBe(404);
    const body = simRes.json<Body>();
    expect(body.error?.code).toBe("provider_not_found");
  });

  it("refuses an invalid sandbox key", async () => {
    const simRes = await app.inject({
      method: "POST",
      url: "/v1/sandbox/wave/v1/checkout/sessions",
      headers: {
        "x-sandbox-key": "sbk_0000000000000000000000000000000000000000000000000000000000000000",
      },
      payload: {
        scenario: "payment_success",
        method: "POST",
        path: "/v1/checkout/sessions",
      },
    });

    expect(simRes.statusCode).toBe(401);
    const body = simRes.json<Body>();
    expect(body.error?.code).toBe("sandbox_key_invalid");
  });
});
