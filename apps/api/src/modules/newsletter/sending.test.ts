import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import type { MailMessage, Mailer } from "../../mail/mailer.js";
import { writePost } from "../../testing-blog.js";
import type { WrittenPost } from "../../testing-blog.js";
import { promoteAdmin } from "../../testing-discussions.js";
import { sendIssue, subscribeConfirmed, tokenMailedTo } from "../../testing-newsletter.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount, sessionSecret, webOrigin } from "../../testing.js";
import { createNewsletterWorker } from "./index.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let sent: MailMessage[];
let clock: ReturnType<typeof testClock>;
let admin: string;
let post: WrittenPost;

beforeEach(async () => {
  clock = testClock();
  const test = await createTestApp({ now: clock.now });
  ({ app, db, close } = test);
  sent = test.mailer.sent;
  admin = await registerAccount(app, "admin@example.com");
  await promoteAdmin(db, "admin@example.com");
  post = await writePost(app, admin, { title: "Un article pour la newsletter" });
});
afterEach(() => close());

function worker(mailer: Mailer = { send: (message) => Promise.resolve(void sent.push(message)) }) {
  return createNewsletterWorker({
    db,
    mailer,
    secret: sessionSecret,
    webOrigin,
    now: clock.now,
    batchSize: 2,
  });
}

const issuesTo = (email: string) =>
  sent.filter((mail) => mail.to === email && mail.text.includes("/newsletter/unsubscribe"));

describe("sending an issue", () => {
  it("sends in batches a plain, image-free mail with a one-click unsubscribe link", async () => {
    for (const email of ["a@example.com", "b@example.com", "c@example.com"]) {
      await subscribeConfirmed(app, sent, email);
    }
    const id = await sendIssue(app, admin, [{ kind: "post", id: post.id }]);
    expect(await worker().runOnce()).toBe(2);
    expect(await worker().runOnce()).toBe(1);
    const [mail] = issuesTo("a@example.com");
    expect(mail?.text).toContain(`${webOrigin}/fr/blog/${post.slug}`);
    expect(mail?.html).toContain("Un article pour la newsletter");
    expect(mail?.html).not.toMatch(/<img|<script|https?:\/\/(?!web\.test)/);
    expect(mail?.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(mail?.headers?.["List-Unsubscribe"]).toMatch(/^<http:\/\/web\.test\/v1\/newsletter/);
    const issue = await call(app, "GET", `/v1/newsletter/issues/${id}`, { cookie: admin });
    expect(issue.body.data).toMatchObject({ status: "sent", delivered: 3 });
  });

  it("drops content hidden after the review", async () => {
    await subscribeConfirmed(app, sent, "a@example.com");
    await sendIssue(app, admin, [{ kind: "post", id: post.id }]);
    await call(app, "POST", `/v1/moderation/blog/post/${post.id}`, {
      cookie: admin,
      payload: { action: "hide" },
    });
    await worker().runOnce();
    expect(issuesTo("a@example.com")[0]?.text).not.toContain(post.slug);
  });

  it("retries a failed mail later instead of losing it", async () => {
    await subscribeConfirmed(app, sent, "a@example.com");
    await sendIssue(app, admin, [{ kind: "post", id: post.id }]);
    const failing: Mailer = { send: () => Promise.reject(new Error("smtp down")) };
    expect(await worker(failing).runOnce()).toBe(1);
    expect(await worker().runOnce()).toBe(0);
    clock.advanceDays(1);
    expect(await worker().runOnce()).toBe(1);
    expect(issuesTo("a@example.com")).toHaveLength(1);
  });
});

describe("unsubscribing from an issue", () => {
  it("stops even an issue already queued, from the page or from a one-click client", async () => {
    await subscribeConfirmed(app, sent, "a@example.com");
    await subscribeConfirmed(app, sent, "b@example.com");
    await sendIssue(app, admin, [{ kind: "post", id: post.id }]);
    await worker().runOnce();
    await sendIssue(app, admin, [{ kind: "post", id: post.id }]);
    const pageToken = tokenMailedTo(sent, "a@example.com", "unsubscribe");
    const fromPage = await call(app, "POST", "/v1/newsletter/unsubscribe", {
      payload: { token: pageToken },
    });
    expect(fromPage.body.data).toEqual({ unsubscribed: true });
    const header = issuesTo("b@example.com")[0]?.headers?.["List-Unsubscribe"] ?? "";
    const oneClick = await app.inject({
      method: "POST",
      url: header.slice(header.indexOf("/v1/"), -1),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "List-Unsubscribe=One-Click",
    });
    expect(oneClick.statusCode).toBe(200);
    await worker().runOnce();
    expect(issuesTo("a@example.com")).toHaveLength(1);
    expect(issuesTo("b@example.com")).toHaveLength(1);
  });
});
