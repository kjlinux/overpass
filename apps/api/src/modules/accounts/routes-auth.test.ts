import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, password, registerAccount, sessionCookie, webOrigin } from "../../testing.js";

type Body = { data: Record<string, unknown> | null; error: Record<string, unknown> | null };

let app: FastifyInstance;
let mailer: Awaited<ReturnType<typeof createTestApp>>["mailer"];
let close: () => Promise<void>;

beforeEach(async () => {
  ({ app, mailer, close } = await createTestApp());
});
afterEach(() => close());

const post = (url: string, payload: object, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url, payload, headers: { origin: webOrigin, ...headers } });

describe("POST /v1/auth/register", () => {
  it("creates the account, opens an httpOnly session and hides the hash", async () => {
    const response = await post(
      "/v1/auth/register",
      { email: "Awa@Example.com", password, country: "CI" },
      { "accept-language": "en" },
    );
    expect(response.statusCode).toBe(201);
    const { data } = response.json<Body>();
    expect(data).toMatchObject({ email: "awa@example.com", country: "CI", language: "en" });
    expect(JSON.stringify(data)).not.toMatch(/argon2|passwordHash/);
    const cookie = response.cookies.find((c) => c.name === "overpass_session");
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  });

  it("answers translated field errors with stable codes", async () => {
    const response = await post(
      "/v1/auth/register",
      { email: "nope", password: "short" },
      { "accept-language": "en" },
    );
    expect(response.statusCode).toBe(400);
    const { error } = response.json<Body>();
    expect(error).toMatchObject({
      code: "validation_failed",
      fields: {
        email: { code: "email_invalid" },
        password: { code: "password_too_short" },
        country: { code: "required", message: "This field is required." },
      },
    });
  });

  it("refuses a second account with the same e-mail", async () => {
    await registerAccount(app, "awa@example.com");
    const response = await post("/v1/auth/register", { email: "awa@example.com", password, country: "SN" });
    expect([response.statusCode, response.json<Body>().error?.["code"]]).toEqual([409, "email_taken"]);
  });
});

describe("login and logout", () => {
  beforeEach(async () => {
    await registerAccount(app, "awa@example.com");
  });

  it("logs in and reads the profile with the session cookie", async () => {
    const login = await post("/v1/auth/login", { email: "awa@example.com", password });
    expect(login.statusCode).toBe(200);
    const me = await app.inject({ url: "/v1/me", headers: { cookie: sessionCookie(login) } });
    expect(me.json<Body>().data?.["email"]).toBe("awa@example.com");
  });

  it("explains a failed login in French by default", async () => {
    const response = await post("/v1/auth/login", { email: "awa@example.com", password: "wrong" });
    expect(response.statusCode).toBe(401);
    expect(response.json<Body>().error).toEqual({
      code: "invalid_credentials",
      message: "Adresse e-mail ou mot de passe incorrect.",
    });
  });

  it("clears the cookie on logout", async () => {
    const response = await post("/v1/auth/logout", {});
    const cookie = response.cookies.find((c) => c.name === "overpass_session");
    expect(response.statusCode).toBe(200);
    expect(cookie?.value).toBe("");
  });

  it("requires a session to read the profile", async () => {
    const response = await app.inject({ url: "/v1/me" });
    expect([response.statusCode, response.json<Body>().error?.["code"]]).toEqual([401, "unauthorized"]);
  });
});

describe("password reset", () => {
  it("accepts any address with 202 and mails known ones only", async () => {
    const cookie = await registerAccount(app, "awa@example.com");
    expect((await post("/v1/auth/forgot", { email: "ghost@example.com" })).statusCode).toBe(202);
    expect((await post("/v1/auth/forgot", { email: "awa@example.com" })).statusCode).toBe(202);
    expect(mailer.sent).toHaveLength(1);
    const token = /#token=([\w.-]+)/.exec(mailer.sent[0]?.text ?? "")?.[1] ?? "";
    const reset = await post("/v1/auth/reset", { token, password: "a brand new passphrase" });
    expect(reset.statusCode).toBe(200);
    expect((await app.inject({ url: "/v1/me", headers: { cookie } })).statusCode).toBe(401);
  });
});

describe("protections", () => {
  it("limits login attempts per address", async () => {
    const attempts = Array.from({ length: 11 }, () =>
      post("/v1/auth/login", { email: "awa@example.com", password: "wrong" }),
    );
    const codes = (await Promise.all(attempts)).map((r) => r.statusCode);
    expect(codes.filter((code) => code === 429)).toHaveLength(1);
    const last = await post("/v1/auth/login", { email: "awa@example.com", password: "wrong" });
    expect(last.json<Body>().error?.["code"]).toBe("rate_limited");
  });

  it("refuses a mutation sent from another origin", async () => {
    const response = await post("/v1/auth/login", { email: "a@b.co", password }, { origin: "https://evil.test" });
    expect([response.statusCode, response.json<Body>().error?.["code"]]).toEqual([403, "forbidden_origin"]);
  });

  it("refuses form-encoded bodies, which a foreign page could post", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "email=a%40b.co&password=x",
    });
    expect(response.statusCode).toBe(415);
  });

  it("never lets a browser cache account responses", async () => {
    const response = await post("/v1/auth/login", { email: "x@example.com", password });
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
