import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { reportRoute } from "../../testing-admin.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;
let member: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  member = await registerAccount(app, "member@example.com");
  // A session still valid for a suspended account, as a race with the suspension would leave.
  await db.execute(sql`update users set suspended_at = now(), suspended_reason = 'Spam'
    where email = 'member@example.com'`);
});
afterEach(() => close());

describe("a still valid session of a suspended account", () => {
  it("reads public pages as a visitor", async () => {
    const id = await publishRoute(app, author);
    const detail = await call(app, "GET", `/v1/routes/${id}`, { cookie: member });
    expect(detail.status).toBe(200);
    expect((detail.body.data?.viewer as { eligibility: string }).eligibility).toBe("anonymous");
    expect((await call(app, "GET", "/v1/routes", { cookie: member })).status).toBe(200);
  });

  it("is refused where an account is required", async () => {
    const id = await publishRoute(app, author);
    const report = await reportRoute(app, member, id);
    expect([report.status, report.body.error?.code]).toEqual([403, "account_suspended"]);
    const me = await call(app, "GET", "/v1/me", { cookie: member });
    expect([me.status, me.body.error?.code]).toEqual([403, "account_suspended"]);
  });

  it("can still log out, which clears the cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { origin: "http://web.test", cookie: member },
    });
    expect(response.statusCode).toBe(200);
    const cleared = response.cookies.find((cookie) => cookie.name === "overpass_session");
    expect(cleared?.value).toBe("");
  });
});
