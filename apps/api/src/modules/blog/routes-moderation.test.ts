import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { feedSlugs, rss, writePost } from "../../testing-blog.js";
import type { WrittenPost } from "../../testing-blog.js";
import { promoteAdmin } from "../../testing-discussions.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;
let first: string;
let second: string;
let admin: string;
let post: WrittenPost;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  first = await registerAccount(app, "first@example.com");
  second = await registerAccount(app, "second@example.com");
  admin = await registerAccount(app, "admin@example.com");
  await promoteAdmin(db, "admin@example.com");
  post = await writePost(app, author);
});
afterEach(() => close());

const report = (cookie: string, path = `/v1/posts/${post.id}/reports`) =>
  call(app, "POST", path, { cookie });

const moderate = (cookie: string, action: string, kind = "post", id = post.id) =>
  call(app, "POST", `/v1/moderation/blog/${kind}/${id}`, { cookie, payload: { action } });

const everywhere = async () => ({
  feed: await feedSlugs(app),
  blog: await feedSlugs(app, `?author=${await handleOf(app, author)}`),
  rss: (await rss(app)).includes(post.slug),
});

describe("reports", () => {
  it("hides a post at the second report, from the feed, the blog and RSS", async () => {
    expect((await report(author)).body.error).toMatchObject({ code: "own_content" });
    expect((await report(first)).status).toBe(201);
    expect((await report(first)).body.error).toMatchObject({ code: "already_reported" });
    expect((await everywhere()).feed).toEqual([post.slug]);
    await report(second);
    expect(await everywhere()).toEqual({ feed: [], blog: [], rss: false });
    const asAuthor = await call(app, "GET", `/v1/posts/${post.slug}?lang=fr`, { cookie: author });
    expect(asAuthor.body.data).toMatchObject({ moderation: "hidden" });
  });

  it("refuses a report on a post the reporter cannot read", async () => {
    const draft = await writePost(app, author, { title: "Un brouillon privé", status: "draft" });
    expect((await report(first, `/v1/posts/${draft.id}/reports`)).status).toBe(404);
  });

  it("hides a comment at the second report", async () => {
    const path = `/v1/posts/${post.id}/comments`;
    const created = await call(app, "POST", path, { cookie: first, payload: { content: "Spam" } });
    const commentPath = `/v1/comments/${String(created.body.data?.id)}/reports`;
    await report(author, commentPath);
    await report(second, commentPath);
    const { body } = await call(app, "GET", path);
    expect(body.data?.items).toMatchObject([{ moderation: "hidden", content: null }]);
  });
});

describe("admin decisions", () => {
  it("lists reported content for admins only", async () => {
    await report(first);
    expect((await call(app, "GET", "/v1/moderation/blog", { cookie: first })).status).toBe(403);
    const { body } = await call(app, "GET", "/v1/moderation/blog", { cookie: admin });
    expect(body.data).toMatchObject([
      { kind: "post", id: post.id, reports: 1, postSlug: post.slug },
    ]);
  });

  it("hides, blocks and restores a post, and the points follow", async () => {
    expect((await moderate(first, "hide")).body.error).toMatchObject({ code: "admin_only" });
    expect((await moderate(admin, "block")).body.data).toEqual({ moderation: "blocked" });
    expect((await everywhere()).feed).toEqual([]);
    const asAuthor = await call(app, "GET", `/v1/posts/${post.slug}?lang=fr`, { cookie: author });
    expect(asAuthor.status).toBe(404);
    const handle = await handleOf(app, author);
    expect((await call(app, "GET", `/v1/users/${handle}`)).body.data?.points).toBe(0);
    await moderate(admin, "restore");
    expect(await everywhere()).toEqual({ feed: [post.slug], blog: [post.slug], rss: true });
    expect((await call(app, "GET", `/v1/users/${handle}`)).body.data?.points).toBe(10);
  });

  it("suspends a blog: its posts vanish and its author cannot publish", async () => {
    const handle = await handleOf(app, author);
    const path = `/v1/moderation/blogs/${handle}/suspension`;
    expect(
      (await call(app, "POST", path, { cookie: first, payload: { suspended: true } })).status,
    ).toBe(403);
    await call(app, "POST", path, { cookie: admin, payload: { suspended: true } });
    expect((await everywhere()).feed).toEqual([]);
    const again = await call(app, "POST", "/v1/posts", {
      cookie: author,
      payload: {
        language: "fr",
        category: "tutorials",
        title: "Un nouvel essai",
        summary: "R",
        content: "T",
      },
    });
    expect(again.body.error).toMatchObject({ code: "blog_suspended" });
    expect((await call(app, "GET", `/v1/blogs/${handle}`)).body.data).toMatchObject({
      suspended: true,
    });
    await call(app, "POST", path, { cookie: admin, payload: { suspended: false } });
    expect((await everywhere()).feed).toEqual([post.slug]);
  });
});
