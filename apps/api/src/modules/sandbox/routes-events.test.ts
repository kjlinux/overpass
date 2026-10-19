import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";
import { testProvider } from "./fixtures.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let awa: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ sandbox: { providers: [testProvider] } }));
  awa = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

async function newKey() {
  const payload = { provider: "fake" };
  const data = (await call(app, "POST", "/v1/sandbox/keys", { cookie: awa, payload })).body.data;
  return data as { id: string; key: string };
}

function external(_method: "POST", url: string, options: { key: string; payload: object }) {
  const headers = { authorization: `Bearer ${options.key}` };
  return app.inject({ method: "POST", url, headers, payload: options.payload });
}

describe("GET /v1/sandbox/events", () => {
  it("pages from the newest call, then older ones before a cursor", async () => {
    const { id, key } = await newKey();
    for (const amount of [1, 2, 3]) {
      await external("POST", "/v1/sandbox/fake/payments", { key, payload: { amount } });
    }
    const page = (await call(app, "GET", `/v1/sandbox/events?keyId=${id}`, { cookie: awa })).body
      .data as unknown as { cursor: number; request: { body: string } }[];
    expect(page.map((event) => event.request.body)).toEqual([
      '{"amount":3}',
      '{"amount":2}',
      '{"amount":1}',
    ]);
    const older = await call(
      app,
      "GET",
      `/v1/sandbox/events?keyId=${id}&before=${String(page[1]?.cursor)}`,
      {
        cookie: awa,
      },
    );
    expect((older.body.data as unknown as unknown[]).length).toBe(1);
  });

  it("shows a key's events to its owner only", async () => {
    const { id } = await newKey();
    const kofi = await registerAccount(app, "kofi@example.com");
    expect(
      (await call(app, "GET", `/v1/sandbox/events?keyId=${id}`, { cookie: kofi })).status,
    ).toBe(404);
    expect((await call(app, "GET", `/v1/sandbox/events?keyId=${id}`)).status).toBe(401);
  });
});
