import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { moderateRoute, registerAdmin, reportRoute } from "../../testing-admin.js";
import { openThread } from "../../testing-discussions.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;
let member: string;
let admin: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  member = await registerAccount(app, "member@example.com");
  admin = await registerAdmin(app, db, "admin@example.com");
});
afterEach(() => close());

const ids = (body: { data: Record<string, unknown> | null }) =>
  ((body.data?.items ?? []) as { id: string }[]).map((item) => item.id);

describe("POST /v1/routes/:id/reports", () => {
  it("records one report per account", async () => {
    const id = await publishRoute(app, author);
    expect((await reportRoute(app, member, id)).status).toBe(201);
    const again = await reportRoute(app, member, id);
    expect(again.status).toBe(409);
    expect(again.body.error?.code).toBe("already_reported");
  });

  it("refuses visitors, the author, unknown routes and a short reason", async () => {
    const id = await publishRoute(app, author);
    expect((await call(app, "POST", `/v1/routes/${id}/reports`, { payload: {} })).status).toBe(401);
    const own = await reportRoute(app, author, id);
    expect([own.status, own.body.error?.code]).toEqual([403, "own_content"]);
    const unknown = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect((await reportRoute(app, member, unknown)).status).toBe(404);
    expect((await reportRoute(app, member, id, "no")).status).toBe(400);
  });
});

describe("a hidden itinerary", () => {
  it("leaves the catalogue and the search", async () => {
    const id = await publishRoute(app, author);
    await moderateRoute(app, admin, id, "hide");
    expect(ids((await call(app, "GET", "/v1/routes")).body)).toEqual([]);
    expect(ids((await call(app, "GET", "/v1/routes?q=Wave")).body)).toEqual([]);
    await moderateRoute(app, admin, id, "restore");
    expect(ids((await call(app, "GET", "/v1/routes?q=Wave")).body)).toEqual([id]);
  });

  it("answers 404 except to its author and admins", async () => {
    const id = await publishRoute(app, author);
    await moderateRoute(app, admin, id, "hide");
    expect((await call(app, "GET", `/v1/routes/${id}`)).status).toBe(404);
    expect((await call(app, "GET", `/v1/routes/${id}`, { cookie: member })).status).toBe(404);
    const own = await call(app, "GET", `/v1/routes/${id}`, { cookie: author });
    expect([own.status, own.body.data?.moderation]).toEqual([200, "hidden"]);
    expect((await call(app, "GET", `/v1/routes/${id}`, { cookie: admin })).status).toBe(200);
    expect((await reportRoute(app, member, id)).status).toBe(404);
  });

  it("can no longer be checked, linked from a thread or translated by others", async () => {
    const id = await publishRoute(app, author);
    await moderateRoute(app, admin, id, "hide");
    const check = await call(app, "POST", `/v1/routes/${id}/checks`, {
      cookie: member,
      payload: { country: "CI", environment: "test" },
    });
    expect(check.status).toBe(404);
    await expect(openThread(app, member, { route: id })).rejects.toThrow();
  });

  it("stops earning ranking points and leaves the author's public count", async () => {
    const id = await publishRoute(app, author);
    const handle = await handleOf(app, author);
    const profile = async () => (await call(app, "GET", `/v1/users/${handle}`)).body.data;
    expect((await profile())?.points).toBe(10);
    await moderateRoute(app, admin, id, "hide");
    expect((await profile())?.points).toBe(0);
    await moderateRoute(app, admin, id, "restore");
    expect((await profile())?.points).toBe(10);
  });

  it("is never offered in the newsletter draft", async () => {
    const id = await publishRoute(app, author);
    await moderateRoute(app, admin, id, "hide");
    const { body } = await call(app, "GET", "/v1/newsletter/issues/draft?language=fr", {
      cookie: admin,
    });
    const items = (body.data?.items ?? []) as { id: string }[];
    expect(items.map((item) => item.id)).not.toContain(id);
  });

  it("stays in its author's own list", async () => {
    const id = await publishRoute(app, author);
    await moderateRoute(app, admin, id, "hide");
    const { body } = await call(app, "GET", "/v1/me/routes", { cookie: author });
    expect((body.data as unknown as { id: string }[]).map((route) => route.id)).toEqual([id]);
  });
});
