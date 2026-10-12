import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { createTestDatabase } from "../../db/testing.js";
import { captureMailer } from "../../mail/testing.js";
import { createTestApp, password, registerAccount, webOrigin } from "../../testing.js";

type Body = { data: Record<string, unknown> | null; error: Record<string, unknown> | null };
type Method = "POST" | "PUT" | "PATCH" | "DELETE";

let app: FastifyInstance;
let close: () => Promise<void>;
let cookie: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp());
  cookie = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

const mutations: [Method, string, object][] = [
  ["PATCH", "/v1/me", { country: "SN" }],
  ["PUT", "/v1/me/password", { currentPassword: password, newPassword: "x".repeat(12) }],
  ["DELETE", "/v1/me", { password }],
  ["POST", "/v1/tokens", { name: "forged", usage: "api" }],
  ["DELETE", "/v1/tokens/00000000-0000-4000-8000-000000000000", {}],
  ["POST", "/v1/auth/logout", {}],
];

const forged = (method: Method, url: string, payload: object, origin?: string) =>
  app.inject({
    method,
    url,
    payload,
    headers: { cookie, ...(origin === undefined ? {} : { origin }) },
  });

describe("cross-site request forgery", () => {
  it.each(mutations)(
    "refuses %s %s from another site, with a valid session",
    async (method, url, payload) => {
      const response = await forged(method, url, payload, "https://evil.test");
      expect([response.statusCode, response.json<Body>().error?.["code"]]).toEqual([
        403,
        "forbidden_origin",
      ]);
    },
  );

  it.each(mutations)("refuses %s %s without any Origin header", async (method, url, payload) => {
    expect((await forged(method, url, payload)).statusCode).toBe(403);
  });

  it("refuses the opaque null origin of sandboxed frames", async () => {
    expect((await forged("PATCH", "/v1/me", { country: "SN" }, "null")).statusCode).toBe(403);
  });

  it("changes nothing when it refuses", async () => {
    await forged("PATCH", "/v1/me", { country: "SN" }, "https://evil.test");
    await forged("DELETE", "/v1/me", { password }, "https://evil.test");
    const me = await app.inject({ url: "/v1/me", headers: { cookie } });
    expect(me.json<Body>().data?.["country"]).toBe("CI");
  });

  it("refuses sign-in from another site, so nobody is logged into an attacker's account", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "awa@example.com", password },
      headers: { origin: "https://evil.test" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("accepts the same change from the web app", async () => {
    const response = await forged("PATCH", "/v1/me", { country: "SN" }, webOrigin);
    expect(response.json<Body>().data?.["country"]).toBe("SN");
  });
});

describe("session cookie in production", () => {
  it("is __Host- prefixed, Secure, httpOnly and SameSite=Lax", async () => {
    const database = await createTestDatabase();
    const mailer = captureMailer();
    const config = {
      NODE_ENV: "production",
      LOG_LEVEL: "silent",
      TRUST_PROXY: 1,
      WEB_ORIGIN: webOrigin,
      SESSION_SECRET: "production-like-secret-with-32-characters",
    } as const;
    const production = await buildApp({ config, db: database.db, mailer });
    const headers = { origin: webOrigin };
    const payload = { email: "ali@example.com", password, country: "ML" };
    await production.inject({ method: "POST", url: "/v1/auth/register", headers, payload });
    const token = /#token=([\w.-]+)/.exec(mailer.sent.at(-1)?.text ?? "")?.[1] ?? "";
    const response = await production.inject({
      method: "POST",
      url: "/v1/auth/confirm",
      headers,
      payload: { token },
    });
    const session = response.cookies.find((c) => c.name === "__Host-overpass_session");
    expect(session).toMatchObject({ secure: true, httpOnly: true, sameSite: "Lax", path: "/" });
    expect(session?.domain).toBeUndefined();
    await production.close();
    await database.close();
  });
});
