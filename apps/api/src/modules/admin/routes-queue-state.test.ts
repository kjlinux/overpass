import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { registerAdmin } from "../../testing-admin.js";
import { writePost } from "../../testing-blog.js";
import { openThread, replyTo } from "../../testing-discussions.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

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

async function ids(kind: string, state: string): Promise<string[]> {
  const url = `/v1/admin/queue?kind=${kind}&state=${state}`;
  const { body } = await call(app, "GET", url, { cookie: admin });
  return ((body.data?.items ?? []) as { id: string }[]).map((item) => item.id);
}

describe("queue states for discussions and blog content", () => {
  it("moves a post and a comment from open to hidden and back", async () => {
    const post = await writePost(app, author);
    const created = await call(app, "POST", `/v1/posts/${post.id}/comments`, {
      cookie: author,
      payload: { content: "Un commentaire à signaler." },
    });
    const comment = String(created.body.data?.id);
    await call(app, "POST", `/v1/posts/${post.id}/reports`, { cookie: member });
    await call(app, "POST", `/v1/comments/${comment}/reports`, { cookie: member });
    for (const [kind, id] of [
      ["post", post.id],
      ["comment", comment],
    ] as const) {
      expect([await ids(kind, "open"), await ids(kind, "hidden")]).toEqual([[id], []]);
      await call(app, "POST", `/v1/moderation/blog/${kind}/${id}`, {
        cookie: admin,
        payload: { action: "hide" },
      });
      expect([await ids(kind, "open"), await ids(kind, "hidden")]).toEqual([[], [id]]);
      await call(app, "POST", `/v1/moderation/blog/${kind}/${id}`, {
        cookie: admin,
        payload: { action: "restore" },
      });
      expect([await ids(kind, "open"), await ids(kind, "hidden")]).toEqual([[], []]);
    }
  });

  it("lists hidden threads and replies, reported or not", async () => {
    const thread = await openThread(app, author);
    const reply = await replyTo(app, author, thread);
    await call(app, "POST", `/v1/threads/${thread}/reports`, { cookie: member });
    expect(await ids("thread", "open")).toEqual([thread]);
    await db.execute(sql`update threads set status = 'hidden' where id = ${thread}`);
    await db.execute(sql`update replies set status = 'hidden' where id = ${reply}`);
    expect([await ids("thread", "open"), await ids("thread", "hidden")]).toEqual([[], [thread]]);
    expect([await ids("reply", "open"), await ids("reply", "hidden")]).toEqual([[], [reply]]);
  });
});
