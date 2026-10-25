import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { confirmMember, follow, star, writePost } from "../../testing-blog.js";
import type { WrittenPost } from "../../testing-blog.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let ada: string;
let bob: string;
let post: WrittenPost;
let clock: ReturnType<typeof testClock>;

beforeEach(async () => {
  clock = testClock();
  ({ app, close } = await createTestApp({ now: clock.now }));
  ada = await registerAccount(app, "ada@example.com");
  await confirmMember(app, ada);
  bob = await registerAccount(app, "bob@example.com", "SN");
  post = await writePost(app, ada);
});
afterEach(() => close());

const points = async (cookie: string) => {
  const handle = await handleOf(app, cookie);
  return (await call(app, "GET", `/v1/users/${handle}`)).body.data?.points;
};

const detail = async (cookie?: string) =>
  (await call(app, "GET", `/v1/posts/${post.slug}?lang=fr`, cookie === undefined ? {} : { cookie }))
    .body.data;

describe("stars", () => {
  it("gives one star per account and one point to the author", async () => {
    expect(await points(ada)).toBe(30);
    expect((await star(app, bob, post.id)).body.data).toEqual({ stars: 1, starred: true });
    expect((await star(app, bob, post.id)).body.error).toMatchObject({ code: "already_starred" });
    expect(await detail(bob)).toMatchObject({ stars: 1, viewer: { starred: true } });
    expect(await points(ada)).toBe(31);
  });

  it("refuses a star on one's own post and takes a star back", async () => {
    expect((await star(app, ada, post.id)).body.error).toMatchObject({ code: "own_post" });
    await star(app, bob, post.id);
    const removed = await call(app, "DELETE", `/v1/posts/${post.id}/star`, { cookie: bob });
    expect(removed.body.data).toEqual({ stars: 0, starred: false });
    expect(await points(ada)).toBe(30);
  });
});

describe("comments", () => {
  it("adds a comment that everyone can read, oldest first", async () => {
    const path = `/v1/posts/${post.id}/comments`;
    expect((await call(app, "POST", path, { payload: { content: "Merci" } })).status).toBe(401);
    const created = await call(app, "POST", path, { cookie: bob, payload: { content: " Merci " } });
    expect(created.status).toBe(201);
    clock.advanceDays(1);
    await call(app, "POST", path, { cookie: ada, payload: { content: "Avec plaisir" } });
    const { body } = await call(app, "GET", path);
    const items = body.data?.items as { content: string; author: string }[];
    expect(items.map((item) => item.content)).toEqual(["Merci", "Avec plaisir"]);
    expect(items[0]?.author).toBe(await handleOf(app, bob));
    expect(await detail()).toMatchObject({ comments: 2 });
  });

  it("refuses a comment on a draft", async () => {
    const draft = await writePost(app, ada, { title: "Un brouillon secret", status: "draft" });
    const path = `/v1/posts/${draft.id}/comments`;
    const refused = await call(app, "POST", path, { cookie: bob, payload: { content: "Vu" } });
    expect(refused.status).toBe(404);
  });
});

describe("follows", () => {
  it("follows and unfollows an author, never oneself", async () => {
    const handle = await handleOf(app, ada);
    expect((await follow(app, bob, handle)).body.data).toEqual({ follows: true, followers: 1 });
    expect((await follow(app, bob, handle)).body.data).toEqual({ follows: true, followers: 1 });
    expect((await follow(app, ada, handle)).body.error).toMatchObject({ code: "own_blog" });
    const mine = await call(app, "GET", "/v1/me/follows", { cookie: bob });
    expect(mine.body.data).toMatchObject([{ handle, country: "CI" }]);
    const gone = await call(app, "DELETE", `/v1/blogs/${handle}/follow`, { cookie: bob });
    expect(gone.body.data).toEqual({ follows: false, followers: 0 });
  });
});

describe("account deletion", () => {
  it("removes the member's posts and gives back the points of the stars they gave", async () => {
    await star(app, bob, post.id);
    const path = `/v1/posts/${post.id}/comments`;
    await call(app, "POST", path, { cookie: bob, payload: { content: "Merci" } });
    await call(app, "DELETE", "/v1/me", {
      cookie: bob,
      payload: { password: "correct horse battery" },
    });
    expect(await points(ada)).toBe(30);
    expect(await detail()).toMatchObject({ stars: 0, comments: 0 });
    await call(app, "DELETE", "/v1/me", {
      cookie: ada,
      payload: { password: "correct horse battery" },
    });
    expect((await call(app, "GET", `/v1/posts/${post.slug}?lang=fr`)).status).toBe(404);
  });
});
