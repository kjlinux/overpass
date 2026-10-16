import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import type { MailMessage } from "../../mail/mailer.js";
import { star, writePost } from "../../testing-blog.js";
import { openThread, promoteAdmin, replyTo } from "../../testing-discussions.js";
import { sampleIssue, sendIssue, subscribe, subscribeConfirmed } from "../../testing-newsletter.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let sent: MailMessage[];
let clock: ReturnType<typeof testClock>;
let admin: string;
let member: string;

beforeEach(async () => {
  clock = testClock();
  const test = await createTestApp({ now: clock.now });
  ({ app, db, close } = test);
  sent = test.mailer.sent;
  admin = await registerAccount(app, "admin@example.com");
  await promoteAdmin(db, "admin@example.com");
  member = await registerAccount(app, "member@example.com", "SN");
});
afterEach(() => close());

const draft = (cookie = admin, language = "fr") =>
  call(app, "GET", `/v1/newsletter/issues/draft?language=${language}`, { cookie });

describe("weekly draft", () => {
  it("is reserved to admins", async () => {
    expect((await draft(member)).status).toBe(403);
    expect((await call(app, "GET", "/v1/newsletter/issues", { cookie: member })).status).toBe(403);
  });

  it("prefills the best itinerary, discussion and post of the week", async () => {
    const old = await writePost(app, member, { title: "Un article de la semaine passée" });
    clock.advanceDays(8);
    const route = await publishRoute(app, member);
    await call(app, "POST", `/v1/routes/${route}/checks`, {
      cookie: admin,
      payload: { country: "CI", environment: "test" },
    });
    const thread = await openThread(app, member);
    await replyTo(app, admin, thread);
    const loved = await writePost(app, member, { title: "Un article très aimé cette semaine" });
    await star(app, admin, loved.id);
    const hidden = await writePost(app, member, { title: "Un article masqué par l'équipe" });
    await call(app, "POST", `/v1/moderation/blog/post/${hidden.id}`, {
      cookie: admin,
      payload: { action: "hide" },
    });
    const { body } = await draft();
    const items = body.data?.items as { kind: string; id: string; path: string }[];
    expect(items.map((item) => `${item.kind}:${item.id}`)).toEqual([
      `route:${route}`,
      `thread:${thread}`,
      `post:${loved.id}`,
    ]);
    expect(items[2]?.path).toBe(`/blog/${loved.slug}`);
    expect(items.some((item) => item.id === old.id || item.id === hidden.id)).toBe(false);
    expect(body.data).toMatchObject({ language: "fr", subject: expect.any(String) as string });
  });
});

describe("issues", () => {
  it("numbers issues per language and lets the team edit a draft", async () => {
    const post = await writePost(app, member);
    const created = await call(app, "POST", "/v1/newsletter/issues", {
      cookie: admin,
      payload: sampleIssue([{ kind: "post", id: post.id }]),
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ number: 1, status: "draft", recipients: 0 });
    const id = String(created.body.data?.id);
    const edited = await call(app, "PATCH", `/v1/newsletter/issues/${id}`, {
      cookie: admin,
      payload: { subject: "Overpass, semaine 42" },
    });
    expect(edited.body.data).toMatchObject({ subject: "Overpass, semaine 42" });
    const list = await call(app, "GET", "/v1/newsletter/issues", { cookie: admin });
    expect(list.body.data).toMatchObject([{ id, number: 1 }]);
  });

  it("queues an issue for confirmed subscribers of its language only", async () => {
    await subscribeConfirmed(app, sent, "fr1@example.com");
    await subscribeConfirmed(app, sent, "fr2@example.com");
    await subscribeConfirmed(app, sent, "en@example.com", "en");
    await subscribe(app, "pending@example.com");
    const post = await writePost(app, member);
    const id = await sendIssue(app, admin, [{ kind: "post", id: post.id }]);
    const issue = await call(app, "GET", `/v1/newsletter/issues/${id}`, { cookie: admin });
    expect(issue.body.data).toMatchObject({ status: "queued", recipients: 2, delivered: 0 });
    const again = await call(app, "POST", `/v1/newsletter/issues/${id}/send`, { cookie: admin });
    expect(again.body.error).toMatchObject({ code: "issue_not_draft" });
    const late = await call(app, "PATCH", `/v1/newsletter/issues/${id}`, {
      cookie: admin,
      payload: { intro: "Trop tard" },
    });
    expect(late.body.error).toMatchObject({ code: "issue_not_draft" });
  });

  it("refuses to send an empty issue", async () => {
    const created = await call(app, "POST", "/v1/newsletter/issues", {
      cookie: admin,
      payload: sampleIssue([]),
    });
    const id = String(created.body.data?.id);
    const refused = await call(app, "POST", `/v1/newsletter/issues/${id}/send`, { cookie: admin });
    expect(refused.body.error).toMatchObject({ code: "issue_empty" });
  });
});
