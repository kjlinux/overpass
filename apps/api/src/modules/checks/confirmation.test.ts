import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, password, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let routeId: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  routeId = await publishRoute(app, await registerAccount(app, "author@example.com"));
});
afterEach(() => close());

describe("an address that never confirmed its sign-up", () => {
  it("has no account: it cannot sign in, check a route or report a pothole", async () => {
    const pending = { email: "pending@example.com", password, country: "CI" };
    expect((await call(app, "POST", "/v1/auth/register", { payload: pending })).status).toBe(202);
    const login = await call(app, "POST", "/v1/auth/login", {
      payload: { email: pending.email, password },
    });
    expect(login.status).toBe(401);
    const check = await call(app, "POST", `/v1/routes/${routeId}/checks`, {
      payload: { country: "CI", environment: "test" },
    });
    expect(check.status).toBe(401);
    const report = await call(app, "POST", `/v1/routes/${routeId}/potholes`, {
      payload: { description: "Le webhook arrive deux fois." },
    });
    expect(report.status).toBe(401);
  });
});
