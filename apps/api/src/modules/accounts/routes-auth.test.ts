import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestApp,
  password,
  registerAccount,
  sessionCookie,
  webOrigin,
} from "../../testing.js";

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

  it("clears the cookie on logout and ends every copy of the session", async () => {
    const login = await post("/v1/auth/login", { email: "awa@example.com", password });
    const cookie = sessionCookie(login);
    const response = await post("/v1/auth/logout", {}, { cookie });
    expect((await app.inject({ url: "/v1/me", headers: { cookie } })).statusCode).toBe(401);
    const cleared = response.cookies.find((c) => c.name === "overpass_session");
    expect(response.statusCode).toBe(200);
    expect(cleared?.value).toBe("");
  });

  it("requires a session to read the profile", async () => {
    const response = await app.inject({ url: "/v1/me" });
    expect([response.statusCode, response.json<Body>().error?.["code"]]).toEqual([
      401,
      "unauthorized",
    ]);
  });
});

describe("password reset", () => {
  it("accepts any address with 202 and mails known ones only", async () => {
    const cookie = await registerAccount(app, "awa@example.com");
    expect((await post("/v1/auth/forgot", { email: "ghost@example.com" })).statusCode).toBe(202);
    expect((await post("/v1/auth/forgot", { email: "awa@example.com" })).statusCode).toBe(202);
    expect(mailer.sent.filter((mail) => mail.text.includes("reset-password"))).toHaveLength(1);
    const token = /#token=([\w.-]+)/.exec(mailer.sent.at(-1)?.text ?? "")?.[1] ?? "";
    const reset = await post("/v1/auth/reset", { token, password: "a brand new passphrase" });
    expect(reset.statusCode).toBe(200);
    expect((await app.inject({ url: "/v1/me", headers: { cookie } })).statusCode).toBe(401);
  });
});

describe("protections", () => {
  const attempt = (email: string, remoteAddress: string) =>
    app.inject({
      method: "POST",
      url: "/v1/auth/login",
      remoteAddress,
      payload: { email, password: "wrong" },
      headers: { origin: webOrigin },
    });

  it("limits login attempts per IP address", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 11; i++)
      codes.push((await attempt(`u${String(i)}@example.com`, "10.0.0.1")).statusCode);
    expect(codes.slice(0, 10).every((code) => code === 401)).toBe(true);
    const blocked = await attempt("awa@example.com", "10.0.0.1");
    expect([blocked.statusCode, blocked.json<Body>().error?.["code"]]).toEqual([
      429,
      "rate_limited",
    ]);
    expect((await attempt("awa@example.com", "10.0.0.2")).statusCode).toBe(401);
  });

  it("does not let failed attempts from many addresses lock an account out", async () => {
    await registerAccount(app, "awa@example.com");
    for (let i = 0; i < 25; i++) await attempt("awa@example.com", `10.0.1.${String(i)}`);
    const owner = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      remoteAddress: "10.0.2.1",
      payload: { email: "awa@example.com", password },
      headers: { origin: webOrigin },
    });
    expect(owner.statusCode).toBe(200);
  });

  it("limits reset requests per e-mail across IP addresses", async () => {
    const forgot = (ip: string) =>
      app.inject({
        method: "POST",
        url: "/v1/auth/forgot",
        remoteAddress: ip,
        payload: { email: "awa@example.com" },
        headers: { origin: webOrigin },
      });
    for (let i = 0; i < 3; i++) expect((await forgot(`10.0.3.${String(i)}`)).statusCode).toBe(202);
    expect((await forgot("10.0.4.1")).statusCode).toBe(429);
  });

  it("refuses a mutation sent from another origin", async () => {
    const response = await post(
      "/v1/auth/login",
      { email: "a@b.co", password },
      { origin: "https://evil.test" },
    );
    expect([response.statusCode, response.json<Body>().error?.["code"]]).toEqual([
      403,
      "forbidden_origin",
    ]);
  });

  it("refuses form-encoded bodies, which a foreign page could post", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "email=a%40b.co&password=x",
    });
    expect(response.statusCode).toBe(415);
    expect(response.json<Body>().error?.["code"]).toBe("unsupported_media_type");
  });

  it("never lets a browser cache account responses", async () => {
    const response = await post("/v1/auth/login", { email: "x@example.com", password });
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
