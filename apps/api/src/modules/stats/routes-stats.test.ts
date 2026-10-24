import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { moderateRoute, registerAdmin } from "../../testing-admin.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;
let checker: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  checker = await registerAccount(app, "checker@example.com");
});
afterEach(() => close());

const stats = async () => {
  const response = await app.inject({ method: "GET", url: "/v1/stats" });
  return { response, data: response.json<{ data: Record<string, unknown> }>().data };
};

const check = (id: string) =>
  call(app, "POST", `/v1/routes/${id}/checks`, {
    cookie: checker,
    payload: { country: "CI", environment: "test" },
  });

describe("GET /v1/stats", () => {
  it("counts nothing on an empty catalogue and lists the confirmed countries", async () => {
    const { response, data } = await stats();
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=60");
    expect(data.routes).toBe(0);
    expect(data.checks).toBe(0);
    const countries = data.countries as string[];
    expect(countries).toContain("CI");
    expect(countries).toEqual([...countries].sort());
    expect(new Set(countries).size).toBe(countries.length);
    expect(data.updatedAt).toBe("2026-10-13T12:00:00.000Z");
  });

  it("counts published itineraries and their checks", async () => {
    const id = await publishRoute(app, author);
    await publishRoute(app, author, { title: "Encaisser un paiement Wave depuis Django" });
    await check(id);
    const { data } = await stats();
    expect(data).toMatchObject({ routes: 2, checks: 1 });
  });

  it("leaves out deleted and hidden itineraries with their checks", async () => {
    const hidden = await publishRoute(app, author);
    const removed = await publishRoute(app, author, { title: "Un itinéraire bientôt supprimé" });
    await check(hidden);
    await call(app, "DELETE", `/v1/routes/${removed}`, { cookie: author });
    const admin = await registerAdmin(app, db, "admin@example.com");
    await moderateRoute(app, admin, hidden, "hide");
    expect((await stats()).data).toMatchObject({ routes: 0, checks: 0 });
  });

  it("adds a country confirmed by the community", async () => {
    const id = await publishRoute(app, author, { country: "AO" });
    expect((await stats()).data.countries).not.toContain("AO");
    for (const email of ["a@example.com", "b@example.com"]) {
      const cookie = await registerAccount(app, email);
      await call(app, "POST", `/v1/routes/${id}/checks`, {
        cookie,
        payload: { country: "AO", environment: "production" },
      });
    }
    await check(id);
    expect((await stats()).data.countries).toContain("AO");
  });
});
