import { createHash } from "node:crypto";
import type { Scenario } from "@overpass/simulator";
import { describe, expect, it } from "vitest";
import { harness } from "../testing.js";
import { paydunya } from "./index.js";

const base = "/sandbox-api/v1/checkout-invoice";
const keys = { "paydunya-master-key": "mk-test", "paydunya-private-key": "ovp_test_k" };
const invoice = {
  invoice: { total_amount: 5000, description: "Commande 1042" },
  store: { name: "Boutique Test" },
};
const sha512 = (text: string) => createHash("sha512").update(text).digest("hex");

async function created(scenario: Scenario, body: unknown = invoice) {
  const sim = harness(paydunya);
  const result = await sim.call(scenario, {
    method: "POST",
    path: `${base}/create`,
    headers: keys,
    body,
  });
  const token = (result.response.body as { token?: string }).token ?? "";
  const confirm = () =>
    sim.call(scenario, { method: "GET", path: `${base}/confirm/${token}`, headers: keys });
  return { result, token, confirm };
}

describe("checkout-invoice/create", () => {
  it("answers the documented fields in order, with a test token and a sandbox page", async () => {
    const { result, token } = await created("success");
    expect(result.response.status).toBe(200);
    expect(Object.keys(result.response.body as object)).toEqual([
      "response_code",
      "response_text",
      "description",
      "token",
    ]);
    expect(token).toMatch(/^test_[A-Za-z0-9]{10}$/);
    expect(result.response.body).toMatchObject({
      response_code: "00",
      response_text: `https://overpass.test/sandbox/launch/paydunya/${token}`,
      description: "Checkout Invoice Created",
    });
  });

  it("refuses an invoice without store.name, never with the success code", async () => {
    const { result } = await created("success", { invoice: { total_amount: 5000 } });
    expect(result.response.status).toBe(400);
    const body = result.response.body as { response_code: string; response_text: string };
    expect(body.response_code).not.toBe("00");
    expect(body.response_text).toContain("store.name");
  });
});

describe("checkout-invoice/confirm", () => {
  it("returns the paid invoice with the hash of the master key sent", async () => {
    const { confirm } = await created("success");
    const body = (await confirm()).response.body as Record<string, unknown>;
    expect(Object.keys(body).slice(0, 4)).toEqual([
      "response_code",
      "response_text",
      "hash",
      "invoice",
    ]);
    expect(body).toMatchObject({
      response_code: "00",
      response_text: "Transaction Found",
      hash: sha512("mk-test"),
      mode: "test",
      status: "completed",
      fail_reason: "",
      invoice: { total_amount: 5000, description: "Commande 1042" },
    });
  });

  it.each([
    ["insufficient_funds", "failed", 1],
    ["timeout", "pending", 0],
    ["duplicate_webhook", "completed", 2],
  ] as const)("%s leaves the invoice %s with %i IPN", async (scenario, status, ipns) => {
    const { result, confirm } = await created(scenario);
    expect(((await confirm()).response.body as { status: string }).status).toBe(status);
    expect(result.webhooks).toHaveLength(ipns);
  });

  it("answers an unknown token with a 404 that is not a success code", async () => {
    const sim = harness(paydunya);
    const result = await sim.call("success", {
      method: "GET",
      path: `${base}/confirm/test_nope`,
      headers: keys,
    });
    expect(result.response.status).toBe(404);
    expect((result.response.body as { response_code: string }).response_code).not.toBe("00");
  });
});

describe("IPN", () => {
  it("posts the confirm structure as form data under data, hashed with the master key", async () => {
    const { result, token } = await created("success");
    const event = result.webhooks[0]?.event;
    if (event === undefined) throw new Error("no IPN");
    const now = new Date("2026-10-15T10:00:00Z");
    const wire = paydunya.webhooks.render(event, { secret: "whsec", now });
    expect(wire.headers["content-type"]).toBe("application/x-www-form-urlencoded");
    const form = new URLSearchParams(wire.body);
    expect(form.get("data[response_code]")).toBe("00");
    expect(form.get("data[hash]")).toBe(sha512("whsec"));
    expect(form.get("data[invoice][token]")).toBe(token);
    expect(form.get("data[invoice][total_amount]")).toBe("5000");
    expect(form.get("data[status]")).toBe("completed");
  });

  it("reads the test key from PAYDUNYA-PRIVATE-KEY", () => {
    const request = { method: "GET" as const, path: "/", query: {}, rawBody: "", body: undefined };
    expect(paydunya.credential({ ...request, headers: keys })).toBe("ovp_test_k");
    expect(paydunya.errors.unauthorized({ ...request, headers: {} }).status).toBe(401);
    expect(paydunya.secretHeaders).toEqual([
      "paydunya-master-key",
      "paydunya-private-key",
      "paydunya-token",
    ]);
  });
});
