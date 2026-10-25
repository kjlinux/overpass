import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { feedSlugs, follow, rss, star, writePost } from "../../testing-blog.js";
import { promoteAdmin } from "../../testing-discussions.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, handleOf, password, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let clock: ReturnType<typeof testClock>;
let ada: string;
let bob: string;
let eve: string;

beforeEach(async () => {
  clock = testClock();
  ({ app, db, close } = await createTestApp({ now: clock.now }));
  ada = await registerAccount(app, "ada@example.com");
  bob = await registerAccount(app, "bob@example.com", "SN");
  eve = await registerAccount(app, "eve@example.com", "BJ");
});
afterEach(() => close());

/** Writes one post a day so the publication order is known. */
async function daily(cookie: string, title: string, extra: Record<string, unknown> = {}) {
  clock.advanceDays(1);
  return writePost(app, cookie, { title, ...extra });
}

describe("recent feed", () => {
  it("lists published posts newest first, page by page", async () => {
    await daily(ada, "Premier article de test");
    await daily(bob, "Deuxième article de test");
    await daily(ada, "Troisième article de test");
    await writePost(app, ada, { title: "Un brouillon jamais lu", status: "draft" });
    const first = await call(app, "GET", "/v1/posts?limit=2");
    expect(first.body.data?.items).toHaveLength(2);
    const cursor = String(first.body.data?.nextCursor);
    expect(await feedSlugs(app, `?limit=2&cursor=${cursor}`)).toEqual(["premier-article-de-test"]);
    expect(await feedSlugs(app)).toEqual([
      "troisieme-article-de-test",
      "deuxieme-article-de-test",
      "premier-article-de-test",
    ]);
  });

  it("filters by category, language, author and news", async () => {
    await daily(ada, "Un portrait de développeuse", { category: "portraits" });
    await daily(bob, "An English tutorial on Wave", { language: "en" });
    expect(await feedSlugs(app, "?category=portraits")).toEqual(["un-portrait-de-developpeuse"]);
    expect(await feedSlugs(app, "?language=en")).toEqual(["an-english-tutorial-on-wave"]);
    expect(await feedSlugs(app, `?author=${await handleOf(app, ada)}`)).toEqual([
      "un-portrait-de-developpeuse",
    ]);
    expect(await feedSlugs(app, "?feed=news")).toEqual([]);
  });

  it("shows one version per translation, in the reader's language when it exists", async () => {
    const french = await daily(ada, "Encaisser avec Wave");
    await daily(ada, "Collect with Wave", { language: "en", translationOf: french.id });
    await daily(bob, "Only in English", { language: "en" });
    expect(await feedSlugs(app, "?lang=fr")).toEqual(["only-in-english", "encaisser-avec-wave"]);
    expect(await feedSlugs(app, "?lang=en")).toEqual(["only-in-english", "collect-with-wave"]);
  });
});

describe("for me feed", () => {
  it("puts followed authors first, then recent posts by stars", async () => {
    const quiet = await daily(ada, "Article sans étoile de Ada");
    const loved = await daily(bob, "Article très aimé de Bob");
    const followed = await daily(eve, "Article plus ancien de Eve", {});
    await star(app, ada, loved.id);
    await star(app, eve, loved.id);
    const viewer = await registerAccount(app, "viewer@example.com");
    await follow(app, viewer, await handleOf(app, eve));
    expect(await feedSlugs(app, "?feed=forme", viewer)).toEqual([
      followed.slug,
      loved.slug,
      quiet.slug,
    ]);
    expect(await feedSlugs(app, "?feed=forme")).toEqual([loved.slug, followed.slug, quiet.slug]);
  });

  it("keeps news whose author left for a reader who follows someone", async () => {
    await promoteAdmin(db, "eve@example.com");
    const news = await daily(eve, "Une actualité de l'équipe", {
      kind: "news",
      category: "tech-news",
    });
    await call(app, "DELETE", "/v1/me", { cookie: eve, payload: { password } });
    await daily(ada, "Un article de Ada suivie");
    await follow(app, bob, await handleOf(app, ada));
    expect(await feedSlugs(app, "?feed=forme", bob)).toContain(news.slug);
  });

  it("pages across both parts without repeating a post", async () => {
    for (const title of ["Un article numéro un", "Un article numéro deux"]) {
      await daily(eve, title);
    }
    await daily(ada, "Un article numéro trois");
    await follow(app, bob, await handleOf(app, eve));
    const first = await call(app, "GET", "/v1/posts?feed=forme&limit=2", { cookie: bob });
    const cursor = String(first.body.data?.nextCursor);
    const second = await feedSlugs(app, `?feed=forme&limit=2&cursor=${cursor}`, bob);
    expect(second).toEqual(["un-article-numero-trois"]);
  });

  it("keeps recent posts only for the top rated part", async () => {
    await daily(ada, "Un article vieux de deux mois");
    clock.advanceDays(60);
    await daily(bob, "Un article de cette semaine");
    expect(await feedSlugs(app, "?feed=forme")).toEqual(["un-article-de-cette-semaine"]);
  });
});

describe("blog page", () => {
  it("describes a member blog with its followers", async () => {
    const handle = await handleOf(app, ada);
    await follow(app, bob, handle);
    const { body } = await call(app, "GET", `/v1/blogs/${handle}`, { cookie: bob });
    expect(body.data).toMatchObject({
      handle,
      suspended: false,
      followers: 1,
      viewer: { isOwner: false, follows: true },
    });
    expect((await call(app, "GET", "/v1/blogs/nobody-here")).status).toBe(404);
  });
});

describe("RSS", () => {
  it("serves one escaped feed per language", async () => {
    await daily(ada, "Tests & astuces <Laravel>");
    await daily(bob, "An English post about SMS", { language: "en" });
    const response = await app.inject({ method: "GET", url: "/v1/posts/feed.xml?lang=fr" });
    expect(response.headers["content-type"]).toContain("application/rss+xml");
    const fr = await rss(app, "fr");
    expect(fr).toContain("<title>Tests &amp; astuces &lt;Laravel&gt;</title>");
    expect(fr).toContain("http://web.test/fr/blog/tests-astuces-laravel");
    expect(fr).not.toContain("An English post");
    expect(await rss(app, "en")).toContain("An English post about SMS");
  });
});
