import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const app = buildApp({ LOG_LEVEL: "silent" });
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
});
