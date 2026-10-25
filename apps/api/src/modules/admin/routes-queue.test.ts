import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { logRows, moderateRoute, registerAdmin, reportRoute } from "../../testing-admin.js";
import { confirmMember, writePost } from "../../testing-blog.js";
import { openThread, replyTo } from "../../testing-discussions.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let clock: ReturnType<typeof testClock>;
let author: string;
let member: string;
let admin: string;

beforeEach(async () => {
  clock = testClock();
  ({ app, db, close } = await createTestApp({ now: clock.now }));
  author = await registerAccount(app, "author@example.com");
  await confirmMember(app, author);
  member = await registerAccount(app, "member@example.com");
  admin = await registerAdmin(app, db, "admin@example.com");
});
afterEach(() => close());

type Item = { kind: string; id: string; reports: number; status: string; path: string };

async function queue(query = "", cookie = admin) {
  const { status, body } = await call(app, "GET", `/v1/admin/queue${query}`, { cookie });
  const data = body.data as { items: Item[]; next: string | null } | null;
  return { status, items: data?.items ?? [], next: data?.next ?? null, code: body.error?.code };
}

describe("admin access", () => {
  it("answers 401 to visitors and 403 to members on every admin route", async () => {
    const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
    const reads = ["/v1/admin/queue", "/v1/admin/accounts", "/v1/admin/log"];
    for (const url of reads) {
      expect((await call(app, "GET", url)).status).toBe(401);
      const member403 = await call(app, "GET", url, { cookie: member });
      expect([member403.status, member403.body.error?.code]).toEqual([403, "admin_only"]);
    }
    const writes = [
      [`/v1/admin/routes/${id}/moderation`, { decision: "hide" }],
      [`/v1/admin/accounts/${id}/suspend`, { reason: "Spam répété" }],
      [`/v1/admin/accounts/${id}/reactivate`, {}],
    ] as const;
    for (const [url, payload] of writes) {
      expect((await call(app, "POST", url, { payload })).status).toBe(401);
      expect((await call(app, "POST", url, { cookie: member, payload })).status).toBe(403);
    }
  });

  it("answers with no-store", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/admin/queue",
      headers: { cookie: admin },
    });
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});

describe("GET /v1/admin/queue", () => {
  it("lists reported visible itineraries by default, newest report first", async () => {
    const first = await publishRoute(app, author);
    const second = await publishRoute(app, author, { title: "Un second itinéraire Wave" });
    const hidden = await publishRoute(app, author, {
      title: "Un itinéraire masqué sans signalement",
    });
    await publishRoute(app, author, { title: "Un itinéraire sans histoire" });
    await reportRoute(app, member, first);
    clock.advanceDays(1);
    await reportRoute(app, member, second);
    await moderateRoute(app, admin, hidden, "hide");
    const { items } = await queue();
    expect(items.map((item) => [item.id, item.reports, item.status])).toEqual([
      [second, 1, "visible"],
      [first, 1, "visible"],
    ]);
    const hiddenItems = (await queue("?state=hidden")).items;
    expect(hiddenItems.map((item) => [item.id, item.reports, item.status])).toEqual([
      [hidden, 0, "hidden"],
    ]);
    expect(items[0]?.path).toBe(`/routes/${second}`);
  });

  it("moves an itinerary from open to hidden, then out once restored", async () => {
    const id = await publishRoute(app, author);
    await reportRoute(app, member, id);
    const ids = async (state: string) => (await queue(`?state=${state}`)).items.map((i) => i.id);
    expect([await ids("open"), await ids("hidden")]).toEqual([[id], []]);
    await moderateRoute(app, admin, id, "hide");
    expect([await ids("open"), await ids("hidden")]).toEqual([[], [id]]);
    await moderateRoute(app, admin, id, "restore");
    expect([await ids("open"), await ids("hidden")]).toEqual([[], []]);
    expect((await reportRoute(app, member, id)).status).toBe(201);
    expect(await ids("open")).toEqual([id]);
    expect((await queue("?state=closed")).status).toBe(400);
  });

  it("lists reported threads, replies, posts and comments by kind", async () => {
    const thread = await openThread(app, author);
    const reply = await replyTo(app, author, thread);
    const post = await writePost(app, author);
    const comment = await call(app, "POST", `/v1/posts/${post.id}/comments`, {
      cookie: author,
      payload: { content: "Un commentaire à signaler." },
    });
    const commentId = String(comment.body.data?.id);
    await call(app, "POST", `/v1/threads/${thread}/reports`, { cookie: member });
    await call(app, "POST", `/v1/replies/${reply}/reports`, { cookie: member });
    await call(app, "POST", `/v1/posts/${post.id}/reports`, { cookie: member });
    await call(app, "POST", `/v1/comments/${commentId}/reports`, { cookie: member });
    const expected = { thread, reply, post: post.id, comment: commentId };
    for (const [kind, id] of Object.entries(expected)) {
      const { items } = await queue(`?kind=${kind}`);
      expect(items.map((item) => [item.kind, item.id, item.reports])).toEqual([[kind, id, 1]]);
    }
    expect((await queue("?kind=reply")).items[0]?.path).toBe(`/discussions/${thread}`);
    expect((await queue("?kind=comment")).items[0]?.path).toBe(`/blog/${post.slug}`);
  });

  it("pages 50 items at a time with a cursor", async () => {
    const id = await publishRoute(app, author);
    await db.execute(sql`insert into routes (author_id, service_id, country, stack, language, title,
        content, moderation)
      select author_id, service_id, country, stack, 'en', 'Hidden copy ' || n, content, 'hidden'
      from routes, generate_series(1, 50) as n where id = ${id}`);
    await moderateRoute(app, admin, id, "hide");
    const page = await queue("?state=hidden");
    expect(page.items).toHaveLength(50);
    const rest = await queue(`?state=hidden&cursor=${String(page.next)}`);
    expect(rest.items).toHaveLength(1);
    expect(rest.next).toBeNull();
    expect(new Set([...page.items, ...rest.items].map((item) => item.id)).size).toBe(51);
    expect((await queue("?cursor=nope")).status).toBe(400);
  });
});

describe("POST /v1/admin/routes/:id/moderation", () => {
  it("hides and restores, writing one log row per decision", async () => {
    const id = await publishRoute(app, author);
    const hide = await moderateRoute(app, admin, id, "hide", "Contenu trompeur");
    expect(hide.body.data).toEqual({ moderation: "hidden" });
    expect((await moderateRoute(app, admin, id, "restore")).body.data).toEqual({
      moderation: "visible",
    });
    expect(await logRows(db)).toEqual([
      { action: "hide", target_kind: "route", target_id: id, reason: "Contenu trompeur" },
      { action: "restore", target_kind: "route", target_id: id, reason: null },
    ]);
  });

  it("answers 404 for an unknown or deleted itinerary", async () => {
    const id = await publishRoute(app, author);
    await call(app, "DELETE", `/v1/routes/${id}`, { cookie: author });
    expect((await moderateRoute(app, admin, id, "hide")).status).toBe(404);
    expect(await logRows(db)).toEqual([]);
  });
});
