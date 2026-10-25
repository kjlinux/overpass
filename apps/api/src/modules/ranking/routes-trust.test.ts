import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { confirmMember, samplePost, writePost } from "../../testing-blog.js";
import { itemsOf, openThread } from "../../testing-discussions.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let author: string;
let newcomer: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  newcomer = await registerAccount(app, "newcomer@example.com", "SN");
});
afterEach(() => close());

async function profileOf(cookie: string) {
  const handle = await handleOf(app, cookie);
  return (await call(app, "GET", `/v1/users/${handle}`)).body.data;
}

const listedThreads = async () =>
  itemsOf((await call(app, "GET", "/v1/threads")).body).map((item) => item.id);

describe("confirmed member", () => {
  it("is reached at 20 points and lost with the points", async () => {
    const first = await publishRoute(app, author);
    expect(await profileOf(author)).toMatchObject({ points: 10, confirmed: false });
    await publishRoute(app, author, { title: "Encaisser avec Wave, autre essai" });
    expect(await profileOf(author)).toMatchObject({ points: 20, confirmed: true });
    await call(app, "DELETE", `/v1/routes/${first}`, { cookie: author });
    expect(await profileOf(author)).toMatchObject({ points: 10, confirmed: false });
  });

  it("hides a thread with a single report", async () => {
    const threadId = await openThread(app, newcomer);
    await confirmMember(app, author);
    expect(
      (await call(app, "POST", `/v1/threads/${threadId}/reports`, { cookie: author })).status,
    ).toBe(201);
    expect(await listedThreads()).toEqual([]);
  });

  it("needs two reports from new members, as before", async () => {
    const threadId = await openThread(app, author);
    await call(app, "POST", `/v1/threads/${threadId}/reports`, { cookie: newcomer });
    expect(await listedThreads()).toEqual([threadId]);
  });

  it("hides a post with a single report", async () => {
    await confirmMember(app, author);
    const other = await registerAccount(app, "other@example.com");
    await confirmMember(app, other);
    const post = await writePost(app, other);
    await call(app, "POST", `/v1/posts/${post.id}/reports`, { cookie: author });
    const read = await call(app, "GET", `/v1/posts/${post.slug}?lang=fr`);
    expect(read.status).toBe(404);
  });
});

describe("writing on a blog", () => {
  it("asks a new member to earn trust first", async () => {
    const refused = await call(app, "POST", "/v1/posts", { cookie: newcomer, payload: samplePost });
    expect(refused.status).toBe(403);
    expect(refused.body.error).toMatchObject({ code: "not_confirmed" });
    await confirmMember(app, newcomer);
    const accepted = await call(app, "POST", "/v1/posts", {
      cookie: newcomer,
      payload: samplePost,
    });
    expect(accepted.status).toBe(201);
  });

  it("keeps an existing post editable below the threshold", async () => {
    await confirmMember(app, author);
    const post = await writePost(app, author, { status: "draft" });
    const routes = (await call(app, "GET", "/v1/me/routes", { cookie: author })).body.data;
    for (const route of routes as unknown as { id: string }[]) {
      await call(app, "DELETE", `/v1/routes/${route.id}`, { cookie: author });
    }
    expect(await profileOf(author)).toMatchObject({ confirmed: false });
    const payload = { title: "Encaisser avec Wave, version révisée" };
    const edited = await call(app, "PATCH", `/v1/posts/${post.id}`, { cookie: author, payload });
    expect(edited.status).toBe(200);
  });
});

describe("write quotas", () => {
  const threadsPerHour = 10;

  it("gives a confirmed member three times the base budget", async () => {
    for (let i = 0; i < threadsPerHour; i += 1) await openThread(app, newcomer);
    const blocked = await call(app, "POST", "/v1/threads", { cookie: newcomer, payload: {} });
    expect(blocked.status).toBe(429);
    await confirmMember(app, author);
    const allowed = await call(app, "POST", "/v1/threads", { cookie: author, payload: {} });
    expect(allowed.status).toBe(400);
  });
});
