import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { logRows, moderateRoute, registerAdmin } from "../../testing-admin.js";
import { confirmMember, writePost } from "../../testing-blog.js";
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
  await confirmMember(app, member);
  admin = await registerAdmin(app, db, "admin@example.com");
});
afterEach(() => close());

const post = (url: string, payload: object = {}) =>
  call(app, "POST", url, { cookie: admin, payload });

describe("moderation log", () => {
  it("records a discussion decision", async () => {
    const thread = await openThread(app, member);
    expect((await post(`/v1/moderation/thread/${thread}`, { decision: "remove" })).status).toBe(
      200,
    );
    expect(await logRows(db)).toEqual([
      { action: "remove", target_kind: "thread", target_id: thread, reason: null },
    ]);
  });

  it("records blog decisions and blog suspensions", async () => {
    const written = await writePost(app, member);
    const handle = await handleOf(app, member);
    await post(`/v1/moderation/blog/post/${written.id}`, { action: "block" });
    await post(`/v1/moderation/blogs/${handle}/suspension`, { suspended: true });
    await post(`/v1/moderation/blogs/${handle}/suspension`, { suspended: false });
    const rows = await logRows(db);
    expect(rows.map((row) => [row.action, row.target_kind])).toEqual([
      ["block", "post"],
      ["suspend", "blog"],
      ["reactivate", "blog"],
    ]);
  });

  it("records a proposal decision with its reason", async () => {
    const proposal = await call(app, "POST", "/v1/service-proposals", {
      cookie: member,
      payload: {
        name: "M-Pesa Tanzanie",
        category: "payment",
        country: "TZ",
        docsUrl: "https://developer.mpesa.vm.co.tz/",
      },
    });
    const id = String(proposal.body.data?.id);
    await post(`/v1/admin/service-proposals/${id}`, { decision: "reject", reason: "Doublon" });
    expect(await logRows(db)).toEqual([
      { action: "reject", target_kind: "proposal", target_id: id, reason: "Doublon" },
    ]);
  });

  it("writes nothing when a decision is refused", async () => {
    await call(app, "POST", "/v1/moderation/thread/0f8fad5b-d9cb-469f-a165-70867728950e", {
      cookie: member,
      payload: { decision: "remove" },
    });
    expect(await logRows(db)).toEqual([]);
  });
});

describe("GET /v1/admin/log", () => {
  it("lists decisions newest first with the actor handle, and pages them", async () => {
    const id = await publishRoute(app, member);
    await moderateRoute(app, admin, id, "hide", "Contenu trompeur");
    const first = await call(app, "GET", "/v1/admin/log", { cookie: admin });
    const page = first.body.data as { items: Record<string, unknown>[]; next: string | null };
    expect(page.items).toEqual([
      expect.objectContaining({
        actor: await handleOf(app, admin),
        targetKind: "route",
        targetId: id,
        action: "hide",
        reason: "Contenu trompeur",
      }),
    ]);
    await db.execute(sql`insert into moderation_actions (target_kind, target_id, action)
      select 'route', ${id}, 'restore' from generate_series(1, 50)`);
    const full = (await call(app, "GET", "/v1/admin/log", { cookie: admin })).body.data as {
      items: { actor: string | null }[];
      next: string;
    };
    expect(full.items).toHaveLength(50);
    expect(full.items[0]?.actor).toBeNull();
    const rest = await call(app, "GET", `/v1/admin/log?cursor=${full.next}`, { cookie: admin });
    expect((rest.body.data as { items: unknown[] }).items).toHaveLength(1);
  });
});
