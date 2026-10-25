import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { confirmMember, samplePost, writePost } from "../../testing-blog.js";
import { promoteAdmin } from "../../testing-discussions.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let clock: ReturnType<typeof testClock>;
let ada: string;
let bob: string;

beforeEach(async () => {
  clock = testClock();
  ({ app, db, close } = await createTestApp({ now: clock.now }));
  ada = await registerAccount(app, "ada@example.com");
  await confirmMember(app, ada);
  bob = await registerAccount(app, "bob@example.com", "SN");
  await confirmMember(app, bob);
});
afterEach(() => close());

const read = (slug: string, cookie?: string, lang = "fr") =>
  call(app, "GET", `/v1/posts/${slug}?lang=${lang}`, cookie === undefined ? {} : { cookie });

describe("writing a post", () => {
  it("publishes a member post that anyone can read by its slug", async () => {
    const created = await call(app, "POST", "/v1/posts", { cookie: ada, payload: samplePost });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      kind: "member",
      slug: "encaisser-avec-wave-depuis-laravel",
      status: "published",
      publishedAt: "2026-10-13T12:00:00.000Z",
      author: { handle: await handleOf(app, ada), country: "CI" },
    });
    const { body } = await read("encaisser-avec-wave-depuis-laravel");
    expect(body.data).toMatchObject({ content: samplePost.content, stars: 0, comments: 0 });
  });

  it("asks for a session and validates every field", async () => {
    expect((await call(app, "POST", "/v1/posts", { payload: samplePost })).status).toBe(401);
    const invalid = await call(app, "POST", "/v1/posts", {
      cookie: ada,
      payload: { ...samplePost, category: "gossip" },
    });
    expect(invalid.body.error).toMatchObject({
      fields: { category: { code: "post_category_invalid" } },
    });
  });

  it("gives a second post with the same title its own slug", async () => {
    await writePost(app, ada);
    expect((await writePost(app, bob)).slug).toBe("encaisser-avec-wave-depuis-laravel-2");
  });

  it("keeps a draft for its author only", async () => {
    const { slug } = await writePost(app, ada, { status: "draft" });
    expect((await read(slug)).status).toBe(404);
    expect((await read(slug, bob)).status).toBe(404);
    expect((await read(slug, ada)).body.data).toMatchObject({ status: "draft", publishedAt: null });
  });

  it("holds a scheduled post until its publication date", async () => {
    const publishAt = "2026-10-15T08:00:00.000Z";
    const { slug } = await writePost(app, ada, { publishAt });
    expect((await read(slug)).status).toBe(404);
    clock.advanceDays(2);
    expect((await read(slug)).body.data).toMatchObject({ publishedAt: publishAt });
  });
});

describe("news", () => {
  it("is reserved to admins", async () => {
    const news = { ...samplePost, kind: "news", category: "tech-news" };
    const refused = await call(app, "POST", "/v1/posts", { cookie: ada, payload: news });
    expect(refused.body.error).toMatchObject({ code: "admin_only" });
    await promoteAdmin(db, "ada@example.com");
    const accepted = await call(app, "POST", "/v1/posts", { cookie: ada, payload: news });
    expect(accepted.status).toBe(201);
  });
});

describe("translations", () => {
  it("links the English version and offers it from the French one", async () => {
    const french = await writePost(app, ada);
    const english = await writePost(app, ada, {
      language: "en",
      title: "Collect payments with Wave from Laravel",
      translationOf: french.id,
    });
    const { body } = await read(french.slug);
    expect(body.data).toMatchObject({ translation: { language: "en", slug: english.slug } });
  });

  it("refuses a second post in the same language or another author's post", async () => {
    const french = await writePost(app, ada);
    const again = {
      ...samplePost,
      title: "Encore un article en français",
      translationOf: french.id,
    };
    const twice = await call(app, "POST", "/v1/posts", { cookie: ada, payload: again });
    expect(twice.body.error).toMatchObject({ code: "post_translation_exists" });
    const foreign = { ...again, language: "en" };
    const other = await call(app, "POST", "/v1/posts", { cookie: bob, payload: foreign });
    expect(other.body.error).toMatchObject({ code: "translation_invalid" });
  });
});

describe("editing", () => {
  it("lets the author change a post and nobody else", async () => {
    const { id, slug } = await writePost(app, ada, { status: "draft" });
    const patch = { status: "published", title: "Encaisser avec Wave, version revue" };
    const stranger = await call(app, "PATCH", `/v1/posts/${id}`, { cookie: bob, payload: patch });
    expect(stranger.status).toBe(404);
    const changed = await call(app, "PATCH", `/v1/posts/${id}`, { cookie: ada, payload: patch });
    expect(changed.body.data).toMatchObject({ slug, status: "published", title: patch.title });
  });

  it("lists the author's drafts and posts, newest change first", async () => {
    await writePost(app, ada, { status: "draft", title: "Un brouillon en cours" });
    clock.advanceDays(1);
    await writePost(app, ada);
    await writePost(app, bob, { title: "Un article de Bob sur Orange" });
    const { body } = await call(app, "GET", "/v1/me/posts", { cookie: ada });
    const items = body.data?.items as { id: string; title: string }[];
    expect(items.map((item) => item.title)).toEqual([samplePost.title, "Un brouillon en cours"]);
    const mine = await call(app, "GET", `/v1/me/posts/${items[1]?.id ?? ""}`, { cookie: ada });
    expect(mine.body.data).toMatchObject({ status: "draft", content: samplePost.content });
    const theirs = await call(app, "GET", `/v1/me/posts/${items[1]?.id ?? ""}`, { cookie: bob });
    expect(theirs.status).toBe(404);
  });
});
