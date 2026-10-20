import type { Scenario } from "@overpass/simulator";
import { describe, expect, it } from "vitest";
import { harness } from "../testing.js";
import { cinetpay } from "./index.js";

const apiKey = "ovp_test_k";
const payment = {
  currency: "XOF",
  merchant_transaction_id: "ORDER-42",
  amount: 500,
  success_url: "https://shop.example/payment/success",
  failed_url: "https://shop.example/payment/failed",
  notify_url: "https://shop.example/webhooks/cinetpay",
  lang: "fr",
  designation: "Commande 42",
};
const emptyRequest = {
  method: "POST" as const,
  path: "/",
  query: {},
  headers: {},
  rawBody: "",
  body: undefined as unknown,
};

type Body = Record<string, unknown>;

async function session(scenario: Scenario) {
  const sim = harness(cinetpay);
  const login = await sim.call(scenario, {
    method: "POST",
    path: "/v1/oauth/login",
    body: { api_key: apiKey, api_password: "secret" },
  });
  const token = String((login.response.body as Body).access_token);
  const auth = { authorization: `Bearer ${token}` };
  const create = (body: unknown = payment, headers: Record<string, string> = auth) =>
    sim.call(scenario, { method: "POST", path: "/v1/payment", headers, body });
  const find = (id: string, headers: Record<string, string> = auth) =>
    sim.call(scenario, { method: "GET", path: `/v1/payment/${id}`, headers });
  return { sim, login, token, create, find };
}

describe("oauth/login", () => {
  it("exchanges the key pair for a bearer token that names the test key", async () => {
    const { login, token } = await session("success");
    expect(login.response.status).toBe(200);
    expect(login.response.body).toMatchObject({ token_type: "Bearer", expires_in: 3600 });
    expect(token.startsWith(`${apiKey}.`)).toBe(true);
    const request = { ...emptyRequest, headers: { authorization: `Bearer ${token}` } };
    expect(cinetpay.credential(request)).toBe(apiKey);
  });

  it("refuses a login without api_password with a 422", async () => {
    const sim = harness(cinetpay);
    const result = await sim.call("success", {
      method: "POST",
      path: "/v1/oauth/login",
      body: { api_key: apiKey },
    });
    expect(result.response.status).toBe(422);
  });

  it("reads the test key from the login body before any token exists", () => {
    const request = { ...emptyRequest, body: { api_key: apiKey, api_password: "x" } };
    expect(cinetpay.credential(request)).toBe(apiKey);
  });

  it("prefers the login body over a stale bearer header an SDK may resend", () => {
    const headers = { authorization: "Bearer ovp_test_old.x" };
    const request = { ...emptyRequest, headers, body: { api_key: apiKey, api_password: "x" } };
    expect(cinetpay.credential(request)).toBe(apiKey);
  });

  it("accepts the bearer scheme in any case", async () => {
    const { token, create } = await session("success");
    const result = await create(payment, { authorization: `bearer ${token}` });
    expect(result.response.status).toBe(200);
  });
});

describe("payment identifiers", () => {
  it("refuses a merchant_transaction_id equal to an earlier transaction_id", async () => {
    const { create } = await session("success");
    const first = (await create()).response.body as Body;
    const reused = { ...payment, merchant_transaction_id: String(first.transaction_id) };
    expect((await create(reused)).response.status).toBe(422);
  });
});

describe("payment creation", () => {
  it("answers PENDING with a payment_url and a notify_token to keep", async () => {
    const { create } = await session("success");
    const result = await create();
    expect(result.response.status).toBe(200);
    const body = result.response.body as Body;
    expect(body).toMatchObject({ merchant_transaction_id: "ORDER-42", status: "PENDING" });
    expect(String(body.payment_url)).toMatch(
      /^https:\/\/overpass\.test\/sandbox\/launch\/cinetpay\//,
    );
    expect(String(body.notify_token)).toMatch(/^[a-f0-9]{32}$/);
    expect(body.transaction_id).not.toBe("ORDER-42");
  });

  it("refuses a missing token with INVALID_TOKEN", async () => {
    const { create } = await session("success");
    const result = await create(payment, {});
    expect(result.response.status).toBe(401);
    expect(result.response.body).toMatchObject({ status: "INVALID_TOKEN" });
  });

  it("refuses a token past its lifetime with EXPIRED_TOKEN", async () => {
    const { sim, create } = await session("success");
    sim.now.setTime(sim.now.getTime() + 3601 * 1000);
    expect((await create()).response.body).toMatchObject({ status: "EXPIRED_TOKEN" });
  });

  it.each([
    ["an unknown currency", { ...payment, currency: "EUR" }, "currency"],
    ["an amount that is not a positive integer", { ...payment, amount: 10.5 }, "amount"],
    ["a method without a country suffix", { ...payment, payment_method: "OM" }, "payment_method"],
    ["a missing notify_url", { ...payment, notify_url: undefined }, "notify_url"],
  ])("refuses %s with a 422 naming the field", async (_case, body, field) => {
    const { create } = await session("success");
    const result = await create(body);
    expect(result.response.status).toBe(422);
    expect(String((result.response.body as Body).message)).toContain(field);
  });

  it("refuses a merchant_transaction_id already used", async () => {
    const { create } = await session("success");
    await create();
    expect((await create()).response.status).toBe(422);
  });
});

describe("payment check and webhook", () => {
  it.each([
    ["success", "SUCCESS", 1],
    ["insufficient_funds", "INSUFFICIENT_BALANCE", 1],
    ["timeout", "PENDING", 0],
  ] as const)("%s leaves the payment %s with %d webhook", async (scenario, status, count) => {
    const { create, find } = await session(scenario);
    const created = await create();
    expect(created.webhooks).toHaveLength(count);
    expect((await find("ORDER-42")).response.body).toMatchObject({ status });
    const transactionId = String((created.response.body as Body).transaction_id);
    expect((await find(transactionId)).response.body).toMatchObject({ status });
  });

  it("answers 404 for an unknown payment", async () => {
    const { find } = await session("success");
    expect((await find("NOPE")).response.status).toBe(404);
  });

  it("posts the notify_token with both identifiers, as JSON", async () => {
    const { sim, create } = await session("success");
    const created = await create();
    const event = created.webhooks[0]?.event;
    if (event === undefined) throw new Error("no webhook");
    const rendered = sim.simulator.renderWebhook("cinetpay", event, { secret: "s", now: sim.now });
    expect(rendered.headers["content-type"]).toBe("application/json");
    const body = created.response.body as Body;
    expect(JSON.parse(rendered.body)).toEqual({
      notify_token: body.notify_token,
      merchant_transaction_id: "ORDER-42",
      transaction_id: body.transaction_id,
      status: "SUCCESS",
    });
  });
});
