import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let author: string;
let awa: string;
let routeId: string;
const unknownId = "00000000-0000-4000-8000-000000000099";
const valid = { country: "CI", environment: "test" };

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  awa = await registerAccount(app, "awa@example.com");
  routeId = await publishRoute(app, author);
});
afterEach(() => close());

describe("POST /v1/routes/:id/checks", () => {
  it("requires a session", async () => {
    const response = await call(app, "POST", `/v1/routes/${routeId}/checks`, { payload: valid });
    expect(response.status).toBe(401);
  });

  it("validates the country and the environment", async () => {
    const response = await call(app, "POST", `/v1/routes/${routeId}/checks`, {
      cookie: awa,
      payload: { country: "FR", environment: "staging" },
    });
    expect(response.status).toBe(400);
  });

  it("answers 404 for an unknown or deleted route", async () => {
    const unknown = await call(app, "POST", `/v1/routes/${unknownId}/checks`, {
      cookie: awa,
      payload: valid,
    });
    expect(unknown.status).toBe(404);
    await call(app, "DELETE", `/v1/routes/${routeId}`, { cookie: author });
    const deleted = await call(app, "POST", `/v1/routes/${routeId}/checks`, {
      cookie: awa,
      payload: valid,
    });
    expect(deleted.status).toBe(404);
  });

  it("returns the dated check and lists it in my checks", async () => {
    const created = await call(app, "POST", `/v1/routes/${routeId}/checks`, {
      cookie: awa,
      payload: valid,
    });
    expect(created.body.data).toMatchObject({ ...valid, checkedAt: "2026-10-13T12:00:00.000Z" });
    const mine = await call(app, "GET", "/v1/me/checks", { cookie: awa });
    expect(mine.body.data).toEqual([
      expect.objectContaining({ route: { id: routeId, title: expect.any(String) as string } }),
    ]);
  });
});

describe("route detail as seen by each reader", () => {
  it("shows checks, potholes and the eligibility of the reader", async () => {
    await call(app, "POST", `/v1/routes/${routeId}/checks`, { cookie: awa, payload: valid });
    await call(app, "POST", `/v1/routes/${routeId}/potholes`, {
      cookie: awa,
      payload: { description: "Le webhook arrive deux fois." },
    });
    const detail = (await call(app, "GET", `/v1/routes/${routeId}`, { cookie: awa })).body.data;
    expect(detail?.checks).toHaveLength(1);
    expect(detail?.potholes).toEqual([expect.objectContaining({ status: "open" })]);
    expect(detail?.viewer).toEqual({
      isAuthor: false,
      eligibility: "too_soon",
      nextCheckAt: "2026-11-12T12:00:00.000Z",
    });
    const asAuthor = (await call(app, "GET", `/v1/routes/${routeId}`, { cookie: author })).body;
    expect(asAuthor.data?.viewer).toMatchObject({ isAuthor: true, eligibility: "own_route" });
    const anonymous = (await call(app, "GET", `/v1/routes/${routeId}`)).body.data;
    expect(anonymous?.viewer).toMatchObject({ eligibility: "anonymous" });
  });
});

describe("PATCH /v1/potholes/:id", () => {
  async function reported(): Promise<string> {
    const response = await call(app, "POST", `/v1/routes/${routeId}/potholes`, {
      cookie: awa,
      payload: { description: "Le webhook arrive deux fois." },
    });
    return String(response.body.data?.id);
  }

  it("lets only the author of the route change the status", async () => {
    const id = await reported();
    const byReporter = await call(app, "PATCH", `/v1/potholes/${id}`, {
      cookie: awa,
      payload: { status: "resolved" },
    });
    expect(byReporter.status).toBe(403);
    expect(byReporter.body.error?.code).toBe("forbidden");
    const byAuthor = await call(app, "PATCH", `/v1/potholes/${id}`, {
      cookie: author,
      payload: { status: "confirmed" },
    });
    expect(byAuthor.body.data).toMatchObject({ id, status: "confirmed" });
  });

  it("answers 404 for an unknown pothole", async () => {
    const response = await call(app, "PATCH", `/v1/potholes/${unknownId}`, {
      cookie: author,
      payload: { status: "resolved" },
    });
    expect(response.status).toBe(404);
  });

  it("validates the description of a report", async () => {
    const response = await call(app, "POST", `/v1/routes/${routeId}/potholes`, {
      cookie: awa,
      payload: { description: "court" },
    });
    expect(response.status).toBe(400);
  });
});

describe("contributions on the public profile", () => {
  it("counts checks and confirmed potholes into the points", async () => {
    await call(app, "POST", `/v1/routes/${routeId}/checks`, { cookie: awa, payload: valid });
    const me = (await call(app, "GET", "/v1/me", { cookie: awa })).body.data;
    const profile = (await call(app, "GET", `/v1/users/${String(me?.handle)}`)).body.data;
    expect(profile).toMatchObject({ contributions: { routes: 0, checks: 1, potholes: 0 } });
    const authorMe = (await call(app, "GET", "/v1/me", { cookie: author })).body.data;
    const authorProfile = (await call(app, "GET", `/v1/users/${String(authorMe?.handle)}`)).body;
    expect(authorProfile.data).toMatchObject({ points: 10 });
  });
});
