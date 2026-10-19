import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";
import { testProvider } from "./fixtures.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let awa: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({
    sandbox: { providers: [testProvider], demoProvider: "fake" },
  }));
  awa = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

type Event = {
  id: string;
  scenario: string;
  request: { method: string; path: string; headers: Record<string, string>; body: string };
  response: { status: number; body: unknown };
  deliveries: { eventType: string }[];
};

async function newKey(cookie = awa) {
  const response = await call(app, "POST", "/v1/sandbox/keys", {
    cookie,
    payload: { provider: "fake" },
  });
  return (response.body.data as { id: string }).id;
}

describe("POST /v1/sandbox/keys/:id/run", () => {
  it("plays the provider's example call for the key's owner", async () => {
    const id = await newKey();
    const response = await call(app, "POST", `/v1/sandbox/keys/${id}/run`, {
      cookie: awa,
      payload: { scenario: "insufficient_funds" },
    });
    expect(response.status).toBe(201);
    const { event } = response.body.data as unknown as { event: Event };
    expect(event).toMatchObject({
      scenario: "insufficient_funds",
      request: { method: "POST", path: "/payments", body: '{"amount":2500}' },
      response: { status: 201 },
    });
    expect(event.request.headers.authorization).toBeUndefined();
    // The provider's key order survives storage, so the inspector shows the body as it was sent.
    expect(Object.keys(JSON.parse(event.response.body as string) as object)).toEqual([
      "status",
      "id",
      "body",
    ]);
    expect(event.deliveries.map((delivery) => delivery.eventType)).toEqual(["payment.failed"]);
  });

  it("plays one walkthrough step with what the previous one captured", async () => {
    const id = await newKey();
    const url = `/v1/sandbox/keys/${id}/run`;
    const paid = await call(app, "POST", url, { cookie: awa, payload: { step: "pay" } });
    const { vars } = paid.body.data as unknown as { vars: Record<string, string> };
    expect(vars.paymentId).toMatch(/^pay_/);
    const read = await call(app, "POST", url, { cookie: awa, payload: { step: "read", vars } });
    const { event } = read.body.data as unknown as { event: Event };
    expect(event.request).toMatchObject({
      method: "GET",
      path: `/payments/${vars.paymentId ?? ""}`,
    });
    expect(event.response.status).toBe(200);
    const unknown = await call(app, "POST", url, { cookie: awa, payload: { step: "nope" } });
    expect(unknown.status).toBe(404);
  });

  it("uses the key's scenario when none is given", async () => {
    const id = await newKey();
    const response = await call(app, "POST", `/v1/sandbox/keys/${id}/run`, {
      cookie: awa,
      payload: {},
    });
    expect((response.body.data as unknown as { event: Event }).event.scenario).toBe("success");
  });

  it("is refused without a session, for another owner, or with an unknown scenario", async () => {
    const id = await newKey();
    const kofi = await registerAccount(app, "kofi@example.com");
    expect((await call(app, "POST", `/v1/sandbox/keys/${id}/run`, { payload: {} })).status).toBe(
      401,
    );
    expect(
      (await call(app, "POST", `/v1/sandbox/keys/${id}/run`, { cookie: kofi, payload: {} })).status,
    ).toBe(404);
    const bogus = await call(app, "POST", `/v1/sandbox/keys/${id}/run`, {
      cookie: awa,
      payload: { scenario: "bogus" },
    });
    expect(bogus.status).toBe(400);
  });
});

describe("public demo", () => {
  it("runs a demo scenario without an account and shows its event", async () => {
    const started = await call(app, "POST", "/v1/sandbox/demo", {
      payload: { scenario: "duplicate_webhook" },
    });
    expect(started.status).toBe(201);
    const { id } = started.body.data as { id: string };
    const read = await call(app, "GET", `/v1/sandbox/demo/events/${id}`);
    const event = read.body.data as unknown as Event;
    expect(event).toMatchObject({ provider: "fake", scenario: "duplicate_webhook" });
    expect(event.deliveries).toHaveLength(2);
  });

  it("offers only the three demo scenarios", async () => {
    const response = await call(app, "POST", "/v1/sandbox/demo", {
      payload: { scenario: "timeout" },
    });
    expect(response.status).toBe(400);
  });

  it("never shows a member's event through the demo route", async () => {
    const id = await newKey();
    const run = await call(app, "POST", `/v1/sandbox/keys/${id}/run`, { cookie: awa, payload: {} });
    const eventId = (run.body.data as unknown as { event: Event }).event.id;
    expect((await call(app, "GET", `/v1/sandbox/demo/events/${eventId}`)).status).toBe(404);
  });

  it("limits demos per address", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 11; index += 1) {
      statuses.push(
        (await call(app, "POST", "/v1/sandbox/demo", { payload: { scenario: "success" } })).status,
      );
    }
    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
