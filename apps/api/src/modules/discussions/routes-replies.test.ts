import { pageSizeMax } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { call, testClock } from "../../testing-routes.js";
import { itemsOf, openThread, readThread, replyTo } from "../../testing-discussions.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let asker: string;
let helper: string;
let threadId: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  asker = await registerAccount(app, "asker@example.com");
  helper = await registerAccount(app, "helper@example.com");
  threadId = await openThread(app, asker);
});
afterEach(() => close());

/** Replies written straight to the table, all at one instant an hour before the clock. */
async function bulkReplies(count: number): Promise<void> {
  await db.execute(sql`insert into replies (thread_id, author_id, content, created_at)
    select ${threadId}, (select author_id from threads where id = ${threadId}),
      'Reply ' || n, '2026-10-13T11:00:00Z' from generate_series(1, ${count}) n`);
}

const page = (query: string) => call(app, "GET", `/v1/threads/${threadId}/replies${query}`);

async function walk(limit: number): Promise<{ ids: string[]; pages: number }> {
  const ids: string[] = [];
  let cursor: string | null = "";
  let pages = 0;
  while (cursor !== null) {
    const suffix: string = cursor === "" ? "" : `&cursor=${encodeURIComponent(cursor)}`;
    const { status, body } = await page(`?limit=${String(limit)}${suffix}`);
    expect(status).toBe(200);
    ids.push(...itemsOf(body).map((item) => String(item["id"])));
    cursor = (body.data?.["nextCursor"] as string | null | undefined) ?? null;
    pages += 1;
  }
  return { ids, pages };
}

describe("GET /v1/threads/:id/replies", () => {
  it("walks every reply once when they share a timestamp", async () => {
    const created = [];
    for (let index = 0; index < 5; index += 1) created.push(await replyTo(app, helper, threadId));
    const { ids, pages } = await walk(2);
    expect(pages).toBe(3);
    expect(new Set(ids).size).toBe(5);
    expect([...ids].sort()).toEqual([...created].sort());
  });

  it("answers 400 with the usual shape on a bad cursor or limit", async () => {
    const bad = await page("?cursor=not-a-cursor");
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatchObject({
      code: "validation_failed",
      fields: { cursor: { code: "cursor_invalid" } },
    });
    expect((await page(`?limit=${String(pageSizeMax + 1)}`)).status).toBe(400);
  });

  it("answers 404 for an unknown thread", async () => {
    const response = await call(app, "GET", `/v1/threads/${crypto.randomUUID()}/replies`);
    expect(response.status).toBe(404);
  });
});

describe("GET /v1/threads/:id with many replies", () => {
  it("serves the first page with a cursor to the rest", async () => {
    await bulkReplies(pageSizeMax + 5);
    const { body } = await readThread(app, threadId);
    expect(itemsOf(body)).toHaveLength(pageSizeMax);
    expect(typeof body.data?.["nextCursor"]).toBe("string");
    const { ids } = await walk(pageSizeMax);
    expect(new Set(ids).size).toBe(pageSizeMax + 5);
  });

  it("keeps the accepted reply reachable beyond the first page", async () => {
    await bulkReplies(pageSizeMax + 5);
    const last = await replyTo(app, helper, threadId, "La dernière réponse est la bonne.");
    const accepted = await call(app, "POST", `/v1/threads/${threadId}/accept`, {
      cookie: asker,
      payload: { reply: last },
    });
    expect(accepted.status).toBe(200);
    const { body } = await readThread(app, threadId);
    expect(itemsOf(body).some((item) => item["id"] === last)).toBe(false);
    expect(body.data?.["accepted"]).toMatchObject({ id: last, accepted: true });
  });

  it("has no accepted reply while the thread is open", async () => {
    await replyTo(app, helper, threadId);
    const { body } = await readThread(app, threadId);
    expect(body.data).toMatchObject({ accepted: null, nextCursor: null });
  });
});

describe("the reply count of a thread", () => {
  it("counts the replies the reader's list holds, hidden ones included", async () => {
    await bulkReplies(3);
    await db.execute(sql`update replies set status = 'hidden'
      where id = (select id from replies where content = 'Reply 2')`);
    await db.execute(sql`update replies set status = 'removed'
      where id = (select id from replies where content = 'Reply 3')`);
    const reader = await readThread(app, threadId, helper);
    expect(reader.body.data).toMatchObject({ replies: 1, listed: 2 });
    await db.execute(sql`update users set role = 'admin' where email = 'helper@example.com'`);
    const moderator = await readThread(app, threadId, helper);
    expect(moderator.body.data).toMatchObject({ listed: 3 });
  });
});
