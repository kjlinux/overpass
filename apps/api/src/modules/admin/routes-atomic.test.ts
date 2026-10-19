import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { moderateRoute, registerAdmin, userIdOf } from "../../testing-admin.js";
import { writePost } from "../../testing-blog.js";
import { openThread } from "../../testing-discussions.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let member: string;
let admin: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  member = await registerAccount(app, "member@example.com");
  admin = await registerAdmin(app, db, "admin@example.com");
});
afterEach(() => close());

/** Every later log insert fails, as a broken log store would. */
const breakLog = () => db.execute(sql`alter table moderation_actions rename to moderation_gone`);

async function one<Row>(query: ReturnType<typeof sql>): Promise<Row | undefined> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows[0];
}

const post = (url: string, payload: object = {}) =>
  call(app, "POST", url, { cookie: admin, payload });

describe("a decision whose log cannot be written", () => {
  it("leaves the itinerary and the account untouched", async () => {
    const id = await publishRoute(app, member);
    const memberId = await userIdOf(db, "member@example.com");
    await breakLog();
    expect((await moderateRoute(app, admin, id, "hide")).status).toBe(500);
    expect((await post(`/v1/admin/accounts/${memberId}/suspend`, { reason: "Spam" })).status).toBe(
      500,
    );
    const route = await one<{ moderation: string }>(
      sql`select moderation from routes where id = ${id}`,
    );
    expect(route?.moderation).toBe("visible");
    const user = await one<{ suspended_at: Date | null }>(
      sql`select suspended_at from users where id = ${memberId}`,
    );
    expect(user?.suspended_at).toBeNull();
  });

  it("leaves discussions, posts, blogs and proposals untouched", async () => {
    const thread = await openThread(app, member);
    const written = await writePost(app, member);
    const handle = await handleOf(app, member);
    const proposal = await call(app, "POST", "/v1/service-proposals", {
      cookie: member,
      payload: {
        name: "M-Pesa Tanzanie",
        category: "payment",
        country: "TZ",
        docsUrl: "https://developer.mpesa.vm.co.tz/",
      },
    });
    await breakLog();
    await post(`/v1/moderation/thread/${thread}`, { decision: "remove" });
    await post(`/v1/moderation/blog/post/${written.id}`, { action: "block" });
    await post(`/v1/moderation/blogs/${handle}/suspension`, { suspended: true });
    const proposalId = String(proposal.body.data?.id);
    await post(`/v1/admin/service-proposals/${proposalId}`, { decision: "reject" });
    const state = await one<Record<string, unknown>>(sql`select
      (select status from threads where id = ${thread}) as thread,
      (select moderation from posts where id = ${written.id}) as post,
      (select count(*)::int from blog_suspensions) as suspensions,
      (select status from service_proposals where id = ${proposalId}) as proposal`);
    expect(state).toEqual({
      thread: "visible",
      post: "visible",
      suspensions: 0,
      proposal: "pending",
    });
  });
});
