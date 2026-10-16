import { z } from "zod";
import { describe, expect, it } from "vitest";
import { ApiCallError, createApiClient } from "./client.js";

const token = `ovp_${"a".repeat(43)}`;

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetch = (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  };
  return { calls, fetch: fetch as typeof globalThis.fetch };
}

function client(fetch: typeof globalThis.fetch) {
  return createApiClient({ baseUrl: "http://api.test/", token, language: "fr", fetch });
}

describe("api client", () => {
  it("sends the bearer token and the language, and returns the enveloped data", async () => {
    const fake = fakeFetch(200, { data: { n: 1 }, error: null });
    const data = await client(fake.fetch).get("/v1/services", z.object({ n: z.number() }));
    expect(data).toEqual({ n: 1 });
    expect(fake.calls[0]?.url).toBe("http://api.test/v1/services");
    const headers = new Headers(fake.calls[0]?.init?.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${token}`);
    expect(headers.get("accept-language")).toBe("fr");
  });

  it("turns a 401 into a token_rejected error", async () => {
    const fake = fakeFetch(401, { data: null, error: { code: "unauthorized", message: "x" } });
    await expect(client(fake.fetch).verifyToken()).rejects.toMatchObject({
      code: "token_rejected",
    });
  });

  it("keeps the stable API error code of any other failure", async () => {
    const fake = fakeFetch(404, { data: null, error: { code: "route_not_found", message: "x" } });
    const call = client(fake.fetch).get("/v1/routes/x", z.unknown());
    await expect(call).rejects.toBeInstanceOf(ApiCallError);
    await expect(call).rejects.toMatchObject({ code: "route_not_found" });
  });

  it("rejects a payload that does not match the expected schema", async () => {
    const fake = fakeFetch(200, { data: { n: "one" }, error: null });
    const call = client(fake.fetch).get("/v1/services", z.object({ n: z.number() }));
    await expect(call).rejects.toMatchObject({ code: "bad_response" });
  });

  it("reports an unreachable API without leaking the token", async () => {
    const failing = (() =>
      Promise.reject(new TypeError(`fetch failed for ${token}`))) as typeof globalThis.fetch;
    const error = await client(failing)
      .get("/v1/services", z.unknown())
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "api_unreachable" });
    expect((error as Error).message).not.toContain(token);
  });

  it("encodes query parameters and drops empty ones", async () => {
    const fake = fakeFetch(200, { data: null, error: null });
    await client(fake.fetch).get("/v1/routes", z.null(), { service: "wave", country: undefined });
    expect(fake.calls[0]?.url).toBe("http://api.test/v1/routes?service=wave");
  });
});
