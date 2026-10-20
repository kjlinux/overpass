import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";
import { testProvider } from "./fixtures.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let clock: ReturnType<typeof testClock>;
let awa: string;
const other = { ...testProvider, identity: { ...testProvider.identity, id: "other" } };

beforeEach(async () => {
  clock = testClock();
  ({ app, db, close } = await createTestApp({
    now: clock.now,
    sandbox: { providers: [testProvider, other] },
  }));
  awa = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

async function newKey(payload: object = { provider: "fake" }) {
  const data = (await call(app, "POST", "/v1/sandbox/keys", { cookie: awa, payload })).body.data;
  return data as { id: string; key: string };
}

type Options = { key?: string; payload?: string | object; headers?: Record<string, string> };

function external(method: "GET" | "POST", url: string, options: Options = {}) {
  const auth = options.key === undefined ? {} : { authorization: `Bearer ${options.key}` };
  const payload = options.payload ?? (method === "POST" ? {} : undefined);
  return app.inject({
    method,
    url,
    headers: { ...auth, ...options.headers },
    ...(payload === undefined ? {} : { payload }),
  });
}

const events = async (keyId: string) =>
  (await call(app, "GET", `/v1/sandbox/events?keyId=${keyId}`, { cookie: awa })).body
    .data as unknown as {
    scenario: string;
    request: { headers: Record<string, string>; body: string };
    response: { status: number };
    deliveries: { eventType: string; target: string; status: string; dueAt: string }[];
    createdAt: string;
  }[];

describe("/v1/sandbox/:provider/*", () => {
  it("answers an unknown provider with the Overpass not-found envelope", async () => {
    const response = await external("POST", "/v1/sandbox/nope/payments", { key: "ovp_test_x" });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: "not_found" } });
  });

  it("refuses a missing, unknown, foreign or revoked key in the provider format", async () => {
    const { id, key } = await newKey();
    const foreign = await newKey({ provider: "other" });
    expect((await external("POST", "/v1/sandbox/fake/payments")).json()).toEqual({
      code: "invalid-auth",
    });
    expect(
      (await external("POST", "/v1/sandbox/fake/payments", { key: "ovp_test_nope" })).statusCode,
    ).toBe(401);
    expect(
      (await external("POST", "/v1/sandbox/fake/payments", { key: foreign.key })).statusCode,
    ).toBe(401);
    await call(app, "DELETE", `/v1/sandbox/keys/${id}`, { cookie: awa });
    expect((await external("POST", "/v1/sandbox/fake/payments", { key })).statusCode).toBe(401);
  });

  it("refuses an expired key", async () => {
    const { key } = await newKey();
    clock.advanceDays(31);
    expect((await external("POST", "/v1/sandbox/fake/payments", { key })).statusCode).toBe(401);
  });

  it("answers in the provider format and records the call with its webhook", async () => {
    const { id, key } = await newKey();
    const response = await external("POST", "/v1/sandbox/fake/payments", {
      key,
      payload: { amount: 1000 },
      headers: { "x-fake-master": "merchant-secret" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.headers["x-fake"]).toBe("1");
    expect(response.json()).toMatchObject({ status: "paid", body: { amount: 1000 } });
    const [event] = await events(id);
    expect(event?.scenario).toBe("success");
    expect(event?.request.headers.authorization).toBe("[redacted]");
    expect(event?.request.headers["x-fake-master"]).toBe("[redacted]");
    expect(event?.request.body).toBe('{"amount":1000}');
    expect(event?.deliveries).toEqual([
      expect.objectContaining({ eventType: "payment.paid", target: "inbox", status: "scheduled" }),
    ]);
  });

  it("never stores the test key when a provider carries it in a body", async () => {
    const { id, key } = await newKey();
    await external("POST", "/v1/sandbox/fake/payments", { key, payload: { api_key: key } });
    const [event] = (await call(app, "GET", `/v1/sandbox/events?keyId=${id}`, { cookie: awa })).body
      .data as unknown as { request: { body: string }; response: { body: string } }[];
    expect(event?.request.body).toBe('{"api_key":"[redacted]"}');
    expect(event?.response.body).not.toContain(key);
  });

  it("follows the key scenario, unless a valid Overpass-Scenario header overrides it", async () => {
    const { id, key } = await newKey({ provider: "fake", scenario: "duplicate_webhook" });
    await external("POST", "/v1/sandbox/fake/payments", { key });
    await external("POST", "/v1/sandbox/fake/payments", {
      key,
      headers: { "overpass-scenario": "insufficient_funds" },
    });
    await external("POST", "/v1/sandbox/fake/payments", {
      key,
      headers: { "overpass-scenario": "bogus" },
    });
    const [bogus, failed, duplicate] = await events(id);
    expect(duplicate?.deliveries).toHaveLength(2);
    expect(failed?.deliveries.map((delivery) => delivery.eventType)).toEqual(["payment.failed"]);
    expect(bogus?.scenario).toBe("duplicate_webhook");
  });

  it("holds a late webhook back", async () => {
    const { id, key } = await newKey({ provider: "fake", scenario: "late_webhook" });
    await external("POST", "/v1/sandbox/fake/payments", { key });
    const [event] = await events(id);
    const delay = Date.parse(event?.deliveries[0]?.dueAt ?? "") - clock.now().getTime();
    expect(delay).toBe(60_000);
  });

  it("keeps simulated objects per key", async () => {
    const first = await newKey();
    const second = await newKey();
    const created = (await external("POST", "/v1/sandbox/fake/payments", { key: first.key })).json<{
      id: string;
    }>();
    expect(
      (await external("GET", `/v1/sandbox/fake/payments/${created.id}`, { key: first.key }))
        .statusCode,
    ).toBe(200);
    expect(
      (await external("GET", `/v1/sandbox/fake/payments/${created.id}`, { key: second.key }))
        .statusCode,
    ).toBe(404);
  });

  it("answers an unknown endpoint with the provider not-found response", async () => {
    const { key } = await newKey();
    const response = await external("GET", "/v1/sandbox/fake/refunds", { key });
    expect(response.json()).toEqual({ code: "not-found" });
  });

  it("reads form bodies and tolerates broken JSON", async () => {
    const { key } = await newKey();
    const form = { "content-type": "application/x-www-form-urlencoded" };
    const response = await external("POST", "/v1/sandbox/fake/payments", {
      key,
      payload: "grant_type=client_credentials&scope=a",
      headers: form,
    });
    expect(response.json()).toMatchObject({
      body: { grant_type: "client_credentials", scope: "a" },
    });
    const json = { "content-type": "application/json" };
    expect(
      (
        await external("POST", "/v1/sandbox/fake/payments", {
          key,
          payload: "{oops",
          headers: json,
        })
      ).statusCode,
    ).toBe(201);
  });

  it("enforces the key quota in the provider format", async () => {
    const { key } = await newKey();
    await db.execute(sql`update sandbox_keys set quota = 2`);
    await external("POST", "/v1/sandbox/fake/payments", { key });
    await external("POST", "/v1/sandbox/fake/payments", { key });
    const response = await external("POST", "/v1/sandbox/fake/payments", { key });
    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({ code: "rate-limited" });
  });
});
