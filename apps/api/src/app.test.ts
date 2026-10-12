import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp({
    config: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      TRUST_PROXY: 0,
      WEB_ORIGIN: "http://web.test",
      SESSION_SECRET: "test-secret-with-at-least-32-characters!",
    },
  });
});
afterAll(() => app.close());

describe("api", () => {
  it("answers the health probe inside the envelope", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { status: "ok" }, error: null });
  });

  it("translates errors from the Accept-Language header", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/nope",
      headers: { "accept-language": "en-GB" },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ data: null, error: { code: "not_found" } });
    expect(response.json<{ error: { message: string } }>().error.message).toMatch(/not be found/);
  });

  it("returns the caller request identifier for tracing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/health",
      headers: { "x-request-id": "trace-1" },
    });
    expect(response.headers["x-request-id"]).toBe("trace-1");
  });

  it("sends hardening headers on every answer", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/health" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });
});
