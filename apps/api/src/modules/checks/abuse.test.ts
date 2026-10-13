import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, stateOf, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let author: string;
let awa: string;
let routeId: string;

const report = (cookie: string, description = "Le webhook arrive deux fois.") =>
  call(app, "POST", `/v1/routes/${routeId}/potholes`, { cookie, payload: { description } });

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  awa = await registerAccount(app, "awa@example.com");
  routeId = await publishRoute(app, author);
});
afterEach(() => close());

describe("one account cannot report a route broken on its own", () => {
  it("refuses a second unresolved pothole from the same account", async () => {
    expect((await report(awa)).status).toBe(201);
    const second = await report(awa, "La session refuse une URL en HTTP.");
    expect(second.status).toBe(409);
    expect(second.body.error?.code).toBe("pothole_exists");
    expect(await stateOf(app, routeId)).toBe("to_verify");
  });

  it("accepts a new report once the previous one is resolved", async () => {
    const first = await report(awa);
    await call(app, "PATCH", `/v1/potholes/${String(first.body.data?.id)}`, {
      cookie: author,
      payload: { status: "resolved" },
    });
    expect((await report(awa, "La session refuse une URL en HTTP.")).status).toBe(201);
  });
});

describe("reads are rate limited", () => {
  it("answers 429 once the per-address budget of the catalogue is spent", async () => {
    let status = 200;
    for (let i = 0; i < 200 && status !== 429; i++) {
      status = (await call(app, "GET", "/v1/routes")).status;
    }
    expect(status).toBe(429);
  });
});
