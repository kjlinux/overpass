import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, testClock } from "../../testing-routes.js";
import { itemsOf, openThread, readThread, replyTo } from "../../testing-discussions.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let asker: string;
let helper: string;
let other: string;
let threadId: string;
let replyId: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  asker = await registerAccount(app, "asker@example.com");
  helper = await registerAccount(app, "helper@example.com");
  other = await registerAccount(app, "other@example.com");
  threadId = await openThread(app, asker);
  replyId = await replyTo(app, helper, threadId);
});
afterEach(() => close());

async function pointsOf(cookie: string): Promise<number> {
  const handle = await handleOf(app, cookie);
  return Number((await call(app, "GET", `/v1/users/${handle}`)).body.data?.points);
}

const vote = (cookie?: string) =>
  call(app, "POST", `/v1/replies/${replyId}/useful`, cookie === undefined ? {} : { cookie });

const accept = (cookie: string, reply = replyId) =>
  call(app, "POST", `/v1/threads/${threadId}/accept`, { cookie, payload: { reply } });

describe("POST /v1/replies/:id/useful", () => {
  it("counts one useful vote per account and gives 1 point to the author", async () => {
    expect((await vote()).status).toBe(401);
    expect((await vote(asker)).status).toBe(200);
    expect((await vote(asker)).status).toBe(409);
    expect((await vote(other)).body.data).toMatchObject({ useful: 2 });
    expect(await pointsOf(helper)).toBe(2);
  });

  it("refuses a vote on one's own reply", async () => {
    const response = await vote(helper);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: "own_reply" });
  });

  it("shows the vote of the reader in the detail", async () => {
    await vote(other);
    const items = itemsOf((await readThread(app, threadId, other)).body);
    expect(items[0]).toMatchObject({ useful: 1, viewer: { voted: true, isAuthor: false } });
  });
});

describe("POST /v1/threads/:id/accept", () => {
  it("is reserved to the author of the thread", async () => {
    const response = await accept(other);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: "not_thread_author" });
  });

  it("resolves the thread and gives 5 points to the author of the reply", async () => {
    expect(await pointsOf(helper)).toBe(0);
    const response = await accept(asker);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ state: "resolved", acceptedReplyId: replyId });
    expect(itemsOf(response.body)[0]).toMatchObject({ accepted: true });
    expect(await pointsOf(helper)).toBe(5);
    const resolved = await call(app, "GET", "/v1/threads?state=resolved");
    expect(itemsOf(resolved.body).map((item) => item.id)).toEqual([threadId]);
  });

  it("moves the points when the author accepts another reply", async () => {
    const second = await replyTo(app, other, threadId, "Regardez aussi les grilles publiées.");
    await accept(asker);
    await accept(asker, second);
    expect(await pointsOf(helper)).toBe(0);
    expect(await pointsOf(other)).toBe(5);
  });

  it("gives no point for accepting one's own reply", async () => {
    const own = await replyTo(app, asker, threadId, "J'ai trouvé : 15 jours facturés par mois.");
    expect((await accept(asker, own)).status).toBe(200);
    expect(await pointsOf(asker)).toBe(0);
  });

  it("answers 404 for a reply of another thread", async () => {
    const elsewhere = await openThread(app, other, { title: "Un autre sujet pour tester" });
    const foreign = await replyTo(app, helper, elsewhere);
    expect((await accept(asker, foreign)).status).toBe(404);
  });
});
