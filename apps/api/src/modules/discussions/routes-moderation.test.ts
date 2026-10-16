import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { call, testClock } from "../../testing-routes.js";
import {
  itemsOf,
  openThread,
  promoteAdmin,
  readThread,
  replyTo,
} from "../../testing-discussions.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;
let first: string;
let second: string;
let admin: string;
let threadId: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  first = await registerAccount(app, "first@example.com");
  second = await registerAccount(app, "second@example.com");
  admin = await registerAccount(app, "admin@example.com");
  await promoteAdmin(db, "admin@example.com");
  threadId = await openThread(app, author);
});
afterEach(() => close());

const report = (cookie: string, path = `/v1/threads/${threadId}/reports`) =>
  call(app, "POST", path, { cookie });

const listed = async () =>
  itemsOf((await call(app, "GET", "/v1/threads")).body).map((item) => item.id);

describe("reports", () => {
  it("refuses one's own content and a second report from the same account", async () => {
    expect((await report(author)).body.error).toMatchObject({ code: "own_content" });
    expect((await report(first)).status).toBe(201);
    expect((await report(first)).body.error).toMatchObject({ code: "already_reported" });
  });

  it("keeps the thread visible after one report and hides it after two", async () => {
    await report(first);
    expect(await listed()).toEqual([threadId]);
    await report(second);
    expect(await listed()).toEqual([]);
    const asStranger = (await readThread(app, threadId, first)).body.data;
    expect(asStranger).toMatchObject({
      status: "hidden",
      content: null,
      viewer: { reported: true },
    });
    const asAuthor = (await readThread(app, threadId, author)).body.data;
    expect(asAuthor).toMatchObject({ status: "hidden", content: expect.any(String) as string });
  });

  it("hides a reported reply and takes back the points it earned", async () => {
    const replyId = await replyTo(app, first, threadId);
    await call(app, "POST", `/v1/replies/${replyId}/useful`, { cookie: author });
    const handle = await handleOf(app, first);
    const pointsOf = async () => (await call(app, "GET", `/v1/users/${handle}`)).body.data?.points;
    expect(await pointsOf()).toBe(1);
    await report(author, `/v1/replies/${replyId}/reports`);
    await report(second, `/v1/replies/${replyId}/reports`);
    expect(itemsOf((await readThread(app, threadId)).body)[0]).toMatchObject({
      status: "hidden",
      content: null,
    });
    expect(await pointsOf()).toBe(0);
  });
});

describe("moderation queue", () => {
  it("is reserved to admins", async () => {
    expect((await call(app, "GET", "/v1/moderation/reports", { cookie: first })).status).toBe(403);
    const decide = await call(app, "POST", `/v1/moderation/thread/${threadId}`, {
      cookie: first,
      payload: { decision: "restore" },
    });
    expect(decide.body.error).toMatchObject({ code: "admin_only" });
  });

  it("lists reported content with its count of open reports", async () => {
    await report(first);
    const queue = (await call(app, "GET", "/v1/moderation/reports", { cookie: admin })).body.data;
    expect(queue).toEqual([
      expect.objectContaining({ kind: "thread", id: threadId, reports: 1, status: "visible" }),
    ]);
  });

  it("restores hidden content and clears its reports", async () => {
    await report(first);
    await report(second);
    const decided = await call(app, "POST", `/v1/moderation/thread/${threadId}`, {
      cookie: admin,
      payload: { decision: "restore" },
    });
    expect(decided.status).toBe(200);
    expect(await listed()).toEqual([threadId]);
    const queue = (await call(app, "GET", "/v1/moderation/reports", { cookie: admin })).body.data;
    expect(queue).toEqual([]);
    expect((await report(first)).status).toBe(201);
    expect(await listed()).toEqual([threadId]);
  });

  it("removes content for good", async () => {
    await call(app, "POST", `/v1/moderation/thread/${threadId}`, {
      cookie: admin,
      payload: { decision: "remove" },
    });
    expect((await readThread(app, threadId, author)).status).toBe(404);
    expect((await readThread(app, threadId, admin)).body.data).toMatchObject({ status: "removed" });
    expect((await report(first)).status).toBe(409);
  });

  it("drops from the queue the replies of a removed thread", async () => {
    const replyId = await replyTo(app, first, threadId);
    await report(second, `/v1/replies/${replyId}/reports`);
    await call(app, "POST", `/v1/moderation/thread/${threadId}`, {
      cookie: admin,
      payload: { decision: "remove" },
    });
    const queue = (await call(app, "GET", "/v1/moderation/reports", { cookie: admin })).body.data;
    expect(queue).toEqual([]);
  });
});
