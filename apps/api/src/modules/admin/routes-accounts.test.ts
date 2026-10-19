import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { logRows, registerAdmin, userIdOf } from "../../testing-admin.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, password, registerAccount, webOrigin } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let member: string;
let memberId: string;
let admin: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  member = await registerAccount(app, "awa@example.com");
  memberId = await userIdOf(db, "awa@example.com");
  admin = await registerAdmin(app, db, "admin@example.com");
});
afterEach(() => close());

type Account = { id: string; email: string; handle: string; suspendedAt: string | null };

async function accounts(query = "") {
  const { body } = await call(app, "GET", `/v1/admin/accounts${query}`, { cookie: admin });
  return body.data as { items: Account[]; next: string | null };
}

const suspend = (id: string, cookie = admin, reason = "Spam répété dans les discussions") =>
  call(app, "POST", `/v1/admin/accounts/${id}/suspend`, { cookie, payload: { reason } });

const login = (email: string) =>
  call(app, "POST", "/v1/auth/login", { payload: { email, password } });

async function personalToken(cookie: string): Promise<string> {
  const created = await call(app, "POST", "/v1/tokens", {
    cookie,
    payload: { name: "Mon MCP", usage: "mcp" },
  });
  return String(created.body.data?.token);
}

const meWithToken = (token: string) =>
  app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${token}` } });

describe("GET /v1/admin/accounts", () => {
  it("lists accounts, newest first, and searches by e-mail or handle prefix", async () => {
    await registerAccount(app, "moussa@example.com", "SN");
    const all = await accounts();
    expect(all.items.map((account) => account.email)).toEqual([
      "moussa@example.com",
      "admin@example.com",
      "awa@example.com",
    ]);
    expect((await accounts("?q=AWA")).items.map((account) => account.email)).toEqual([
      "awa@example.com",
    ]);
    const handle = all.items[1]?.handle ?? "";
    expect((await accounts(`?q=${handle}`)).items.map((account) => account.handle)).toEqual([
      handle,
    ]);
    expect((await accounts("?q=%25")).items).toEqual([]);
  });

  it("pages with a cursor", async () => {
    await db.execute(sql`insert into users (email, password_hash, handle, country)
      select 'u' || n || '@example.com', 'h', 'user-' || n, 'CI' from generate_series(1, 49) n`);
    const page = await accounts();
    expect(page.items).toHaveLength(50);
    const rest = await accounts(`?cursor=${String(page.next)}`);
    expect(rest.items).toHaveLength(1);
    expect(rest.next).toBeNull();
  });
});

describe("suspension", () => {
  it("ends every session, refuses sign-in and personal tokens, then reactivates", async () => {
    const token = await personalToken(member);
    const suspended = await suspend(memberId);
    expect(suspended.status).toBe(200);
    expect((suspended.body.data as unknown as Account).suspendedAt).not.toBeNull();
    expect((await call(app, "GET", "/v1/me", { cookie: member })).status).toBe(401);
    const refused = await login("awa@example.com");
    expect([refused.status, refused.body.error?.code]).toEqual([403, "account_suspended"]);
    const bearer = await meWithToken(token);
    expect(bearer.statusCode).toBe(403);
    expect(bearer.json<{ error: { code: string } }>().error.code).toBe("account_suspended");
    const back = await call(app, "POST", `/v1/admin/accounts/${memberId}/reactivate`, {
      cookie: admin,
    });
    expect((back.body.data as unknown as Account).suspendedAt).toBeNull();
    expect((await login("awa@example.com")).status).toBe(200);
    expect((await meWithToken(token)).statusCode).toBe(200);
    expect((await logRows(db)).map((row) => [row.action, row.target_kind])).toEqual([
      ["suspend", "account"],
      ["reactivate", "account"],
    ]);
  });

  it("refuses to suspend oneself, another admin or twice", async () => {
    const self = await suspend(await userIdOf(db, "admin@example.com"));
    expect([self.status, self.body.error?.code]).toEqual([403, "suspend_self"]);
    await registerAdmin(app, db, "other@example.com");
    const other = await suspend(await userIdOf(db, "other@example.com"));
    expect([other.status, other.body.error?.code]).toEqual([403, "suspend_admin"]);
    await suspend(memberId);
    expect((await suspend(memberId)).body.error?.code).toBe("already_suspended");
    const unknown = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect((await suspend(unknown)).status).toBe(404);
    expect((await suspend(memberId, admin, "")).status).toBe(400);
    expect(await logRows(db)).toHaveLength(1);
  });

  it("refuses to reactivate an active account", async () => {
    const url = `/v1/admin/accounts/${memberId}/reactivate`;
    const response = await call(app, "POST", url, { cookie: admin });
    expect([response.status, response.body.error?.code]).toEqual([409, "not_suspended"]);
  });

  it("checks the request origin on admin writes", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/admin/accounts/${memberId}/suspend`,
      headers: { origin: "https://evil.example", cookie: admin },
      payload: { reason: "Spam répété" },
    });
    expect(response.statusCode).toBe(403);
    expect(webOrigin).not.toBe("https://evil.example");
  });
});
