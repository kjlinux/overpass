import { describe, expect, it } from "vitest";
import { harness } from "../testing.js";
import { wave } from "./index.js";

const order = {
  amount: "1000",
  currency: "XOF",
  error_url: "https://example.com/error",
  success_url: "https://example.com/success",
};

const create = (body: object) =>
  harness(wave).call("success", { method: "POST", path: "/v1/checkout/sessions", body });

describe("request validation", () => {
  it.each([
    [{ ...order, amount: undefined }, "amount"],
    [{ ...order, amount: "0" }, "amount"],
    [{ ...order, amount: "010" }, "amount"],
    [{ ...order, amount: "10.5" }, "amount"],
    [{ ...order, amount: 1000 }, "amount"],
    [{ ...order, currency: "xof" }, "currency"],
    [{ ...order, success_url: "http://example.com/s" }, "success_url"],
    [{ ...order, error_url: undefined }, "error_url"],
    [{ ...order, client_reference: "x".repeat(256) }, "client_reference"],
    [{ ...order, restrict_payer_mobile: "770000000" }, "restrict_payer_mobile"],
  ])("refuses %j with a request-validation-error on %s", async (body, field) => {
    const result = await create(body);
    expect(result.response.status).toBe(400);
    expect(result.response.body).toMatchObject({
      code: "request-validation-error",
      message: "Request invalid",
      details: [{ loc: [field] }],
    });
    expect(result.webhooks).toEqual([]);
  });

  it("accepts two decimal places outside XOF and keeps the payer mobile under both names", async () => {
    const result = await create({
      ...order,
      currency: "USD",
      amount: "10.50",
      restrict_payer_mobile: "+221770000000",
    });
    expect(result.response.status).toBe(200);
    expect(result.response.body).toMatchObject({
      amount: "10.50",
      restrict_payer_mobile: "+221770000000",
      enforce_payer_mobile: "+221770000000",
    });
  });
});

describe("refund and expire", () => {
  async function session(scenario: "success" | "insufficient_funds") {
    const sim = harness(wave);
    const created = await sim.call(scenario, {
      method: "POST",
      path: "/v1/checkout/sessions",
      body: order,
    });
    const id = (created.response.body as { id: string }).id;
    const post = (action: string, target = id) =>
      sim.call("success", { method: "POST", path: `/v1/checkout/sessions/${target}/${action}` });
    return { sim, id, post };
  }

  it("refunds a paid session with an empty 200, twice without a second transaction", async () => {
    const { post } = await session("success");
    expect((await post("refund")).response).toEqual({ status: 200, body: null });
    expect((await post("refund")).response.status).toBe(200);
  });

  it("refuses to refund an unpaid session, and answers 404 for an unknown one", async () => {
    const { post } = await session("insufficient_funds");
    expect((await post("refund")).response).toMatchObject({
      status: 400,
      body: { code: "checkout-refund-failed" },
    });
    expect((await post("refund", "cos-unknown")).response.status).toBe(404);
  });

  it("expires an open session once, then answers 409", async () => {
    const { sim, id, post } = await session("insufficient_funds");
    expect((await post("expire")).response).toEqual({ status: 200, body: null });
    const read = await sim.call("success", { method: "GET", path: `/v1/checkout/sessions/${id}` });
    expect(read.response.body).toMatchObject({ checkout_status: "expired" });
    expect((await post("expire")).response.status).toBe(409);
  });

  it("answers 409 when expiring a completed session", async () => {
    const { post } = await session("success");
    expect((await post("expire")).response.status).toBe(409);
  });
});

describe("authentication", () => {
  const { simulator } = harness(wave);
  const request = (headers: Record<string, string>) => ({
    method: "GET" as const,
    path: "/",
    query: {},
    headers,
    rawBody: "",
    body: undefined,
  });

  it("reads the test key from the bearer header", () => {
    expect(simulator.credential("wave", request({ authorization: "Bearer ovp_test_abc" }))).toBe(
      "ovp_test_abc",
    );
    expect(simulator.credential("wave", request({ authorization: "Basic abc" }))).toBeUndefined();
  });

  it.each([
    [{}, "missing-auth-header"],
    [{ authorization: "Basic abc" }, "invalid-auth"],
    [{ authorization: "Bearer ovp_test_unknown" }, "no-matching-api-key"],
  ])("answers %j with the documented code %s", (headers, code) => {
    expect(simulator.refusal("wave", "unauthorized", request(headers))).toMatchObject({
      status: 401,
      body: { code },
    });
  });
});

describe("identity", () => {
  it("names the documentation it follows and says it is unofficial", () => {
    expect(wave.identity).toMatchObject({
      id: "wave",
      unofficial: true,
      docsUrl: "https://docs.wave.com/checkout",
    });
    expect(wave.webhooks.secretPrefix).toBe("wave_sn_WHS_");
    expect(Object.keys(wave.identity.copy).sort()).toEqual(["en", "fr"]);
    expect(wave.identity.copy.fr?.notes.length).toBeGreaterThan(0);
  });
});
