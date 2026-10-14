import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSimulator } from "./engine.js";
import { fakeProvider, memoryStore, request, sequentialIds } from "./testing.js";

const now = new Date("2026-10-14T10:00:00Z");

function run(scenario: Parameters<typeof base>[0], partial: Parameters<typeof request>[0]) {
  return createSimulator([fakeProvider]).handle("fake", request(partial), base(scenario));
}

function base(scenario: "success" | "insufficient_funds" | "timeout" | "duplicate_webhook") {
  return {
    scenario,
    store: memoryStore(),
    now,
    newId: sequentialIds(),
    webOrigin: "https://web.test",
  };
}

describe("createSimulator", () => {
  it("lists the identity of every loaded provider, marked unofficial", () => {
    const identities = createSimulator([fakeProvider]).identities();
    expect(identities).toEqual([fakeProvider.identity]);
    expect(identities[0]?.unofficial).toBe(true);
  });

  it("refuses two providers with the same id", () => {
    expect(() => createSimulator([fakeProvider, fakeProvider])).toThrow(/fake/);
  });

  it("refuses a provider whose documentation link is not https", () => {
    const identity = { ...fakeProvider.identity, docsUrl: "http://example.com" };
    expect(() => createSimulator([{ ...fakeProvider, identity }])).toThrow(/https/);
  });

  it("refuses a provider id that cannot be a path segment", () => {
    const identity = { ...fakeProvider.identity, id: "Fake Pay" };
    expect(() => createSimulator([{ ...fakeProvider, identity }])).toThrow(/id/);
  });

  it("knows which providers it serves", () => {
    const simulator = createSimulator([fakeProvider]);
    expect(simulator.has("fake")).toBe(true);
    expect(simulator.has("wave")).toBe(false);
  });
});

describe("handle", () => {
  it("returns nothing for an unknown provider", async () => {
    const simulator = createSimulator([fakeProvider]);
    const result = await simulator.handle(
      "nope",
      request({ method: "GET", path: "/" }),
      base("success"),
    );
    expect(result).toBeUndefined();
  });

  it("answers with the provider not-found response when no endpoint matches", async () => {
    const result = await run("success", { method: "DELETE", path: "/payments" });
    expect(result?.response).toEqual({ status: 404, body: { error: "not_found" } });
    expect(result?.webhooks).toEqual([]);
  });

  it("passes the scenario outcome to the endpoint", async () => {
    const result = await run("insufficient_funds", {
      method: "POST",
      path: "/payments",
      body: { amount: 500 },
    });
    expect(result?.response.status).toBe(201);
    expect(result?.response.body).toMatchObject({
      status: "failed",
      reason: "no-money",
      amount: 500,
    });
  });

  it("schedules the provider events with the scenario delivery plan", async () => {
    const result = await run("duplicate_webhook", {
      method: "POST",
      path: "/payments",
      body: { amount: 1 },
    });
    expect(result?.webhooks.map((entry) => [entry.event.type, entry.delayMs])).toEqual([
      ["payment.paid", 0],
      ["payment.paid", 5000],
    ]);
  });

  it("schedules no webhook when the operator times out", async () => {
    const result = await run("timeout", { method: "POST", path: "/payments", body: { amount: 1 } });
    expect(result?.webhooks).toEqual([]);
  });

  it("gives endpoints the path parameters and the shared store", async () => {
    const simulator = createSimulator([fakeProvider]);
    const context = base("success");
    const created = await simulator.handle(
      "fake",
      request({ method: "POST", path: "/payments", body: { amount: 7 } }),
      context,
    );
    const id = (created?.response.body as { id: string }).id;
    const read = await simulator.handle(
      "fake",
      request({ method: "GET", path: `/payments/${id}` }),
      context,
    );
    expect(read?.response.body).toMatchObject({ id, amount: 7, status: "paid" });
  });
});

describe("provider hooks", () => {
  const simulator = createSimulator([fakeProvider]);

  it("reads the test key where the provider expects its credential", () => {
    const presented = request({
      method: "GET",
      path: "/",
      headers: { "x-fake-key": "ovp_test_1" },
    });
    expect(simulator.credential("fake", presented)).toBe("ovp_test_1");
    expect(simulator.credential("nope", presented)).toBeUndefined();
  });

  it("lets the provider shape a refusal from the request", () => {
    const missing = request({ method: "GET", path: "/" });
    expect(simulator.refusal("fake", "unauthorized", missing)).toEqual({
      status: 401,
      body: { error: "missing_key" },
    });
  });

  it("gives endpoints the web origin for links they return", async () => {
    const result = await run("success", { method: "GET", path: "/origin" });
    expect(result?.response.body).toEqual({ origin: "https://web.test" });
  });

  it("answers refusals in the provider format", () => {
    const presented = request({ method: "GET", path: "/", headers: { "x-fake-key": "k" } });
    expect(simulator.refusal("fake", "unauthorized", presented)).toEqual({
      status: 401,
      body: { error: "unauthorized" },
    });
    expect(simulator.refusal("fake", "tooManyRequests", presented).status).toBe(429);
  });

  it("renders and signs a webhook the way the provider documents it", () => {
    const event = { id: "evt_1", type: "payment.paid", payload: { id: "p1" } };
    const rendered = simulator.renderWebhook("fake", event, { secret: "s3cret", now });
    const stamp = (now.getTime() / 1000).toString();
    const expected = createHmac("sha256", "s3cret")
      .update(stamp + rendered.body)
      .digest("hex");
    expect(rendered.headers["x-fake-signature"]).toBe(expected);
    expect(JSON.parse(rendered.body)).toEqual({
      id: "evt_1",
      type: "payment.paid",
      data: { id: "p1" },
    });
  });

  it("gives the documented prefix of webhook secrets, or none", () => {
    const prefixed = {
      ...fakeProvider,
      webhooks: { ...fakeProvider.webhooks, secretPrefix: "whs_" },
    };
    expect(createSimulator([prefixed]).secretPrefix("fake")).toBe("whs_");
    expect(simulator.secretPrefix("fake")).toBe("");
  });

  it("gives the documented example call of a provider, or nothing", () => {
    const example = { method: "POST" as const, path: "/payments", body: { amount: 1 } };
    expect(createSimulator([{ ...fakeProvider, example }]).example("fake")).toEqual(example);
    expect(simulator.example("fake")).toBeUndefined();
    expect(simulator.example("nope")).toBeUndefined();
  });

  it("refuses to render for an unknown provider", () => {
    const event = { id: "e", type: "t", payload: {} };
    expect(() => simulator.renderWebhook("nope", event, { secret: "s", now })).toThrow(/nope/);
  });
});
