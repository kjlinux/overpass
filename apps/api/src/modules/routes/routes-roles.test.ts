import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, password, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;
let awa: string;
let admin: string;
let routeId: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  awa = await registerAccount(app, "awa@example.com");
  admin = await registerAccount(app, "admin@example.com");
  await db.execute(sql`update users set role = 'admin' where email = 'admin@example.com'`);
  routeId = await publishRoute(app, author);
});
afterEach(() => close());

describe("moderation by an admin", () => {
  it("lets an admin edit an itinerary and confirm a pothole", async () => {
    const edited = await call(app, "PATCH", `/v1/routes/${routeId}`, {
      cookie: admin,
      payload: { title: "Titre corrigé par la modération" },
    });
    expect(edited.status).toBe(200);
    const report = await call(app, "POST", `/v1/routes/${routeId}/potholes`, {
      cookie: awa,
      payload: { description: "Le webhook arrive deux fois." },
    });
    const confirmed = await call(app, "PATCH", `/v1/potholes/${String(report.body.data?.id)}`, {
      cookie: admin,
      payload: { status: "confirmed" },
    });
    expect(confirmed.body.data).toMatchObject({
      status: "confirmed",
      handle: expect.any(String) as string,
    });
  });
});

describe("a reporter who deleted their account", () => {
  it("leaves a pothole without handle that the author can still resolve", async () => {
    const report = await call(app, "POST", `/v1/routes/${routeId}/potholes`, {
      cookie: awa,
      payload: { description: "Le webhook arrive deux fois." },
    });
    await call(app, "DELETE", "/v1/me", { cookie: awa, payload: { password } });
    const resolved = await call(app, "PATCH", `/v1/potholes/${String(report.body.data?.id)}`, {
      cookie: author,
      payload: { status: "resolved" },
    });
    expect(resolved.body.data).toMatchObject({ status: "resolved", handle: "" });
  });
});

describe("reading and paging edge cases", () => {
  it("serves the itinerary itself when its own language is requested", async () => {
    const read = (await call(app, "GET", `/v1/routes/${routeId}?lang=fr`)).body.data;
    expect(read).toMatchObject({ id: routeId, fallback: false });
  });

  it("refuses a date cursor in a ranked search", async () => {
    const cursor = Buffer.from(
      JSON.stringify({ mode: "date", key: "2026-10-13T12:00:00.000Z", id: routeId }),
    ).toString("base64url");
    expect((await call(app, "GET", `/v1/routes?q=wave&cursor=${cursor}`)).status).toBe(400);
  });
});
