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
let close: () => Promise<void>;
let cookie: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp());
  cookie = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

const send = (
  method: "POST" | "PATCH" | "PUT" | "DELETE" | "GET",
  url: string,
  payload?: object,
  auth = cookie,
) =>
  app.inject({
    method,
    url,
    ...(payload ? { payload } : {}),
    headers: { origin: webOrigin, cookie: auth },
  });

describe("profile", () => {
  it("updates stacks and records the newsletter consent", async () => {
    const response = await send("PATCH", "/v1/me", { stacks: ["laravel"], newsletter: true });
    expect(response.json<Body>().data).toMatchObject({ stacks: ["laravel"], newsletter: true });
  });

  it("rejects an unknown field", async () => {
    const response = await send("PATCH", "/v1/me", { role: "admin" });
    expect(response.statusCode).toBe(400);
  });

  it("refuses a cookie-authenticated change without an Origin header", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/v1/me",
      payload: {},
      headers: { cookie },
    });
    expect(response.statusCode).toBe(403);
  });

  it("serves the public profile without the e-mail", async () => {
    const me = (await send("GET", "/v1/me")).json<Body>().data;
    const response = await app.inject({ url: `/v1/users/${String(me?.["handle"])}` });
    expect(response.json<Body>().data).toMatchObject({ country: "CI", points: 0 });
    expect(response.body).not.toContain("awa@example.com");
    expect((await app.inject({ url: "/v1/users/nobody-here" })).statusCode).toBe(404);
  });
});

describe("password and deletion", () => {
  it("changes the password, renews this session and closes the old one", async () => {
    expect(
      (
        await send("PUT", "/v1/me/password", {
          currentPassword: "nope",
          newPassword: "x".repeat(12),
        })
      ).statusCode,
    ).toBe(403);
    const response = await send("PUT", "/v1/me/password", {
      currentPassword: password,
      newPassword: "x".repeat(12),
    });
    expect(response.statusCode).toBe(200);
    expect((await send("GET", "/v1/me", undefined, sessionCookie(response))).statusCode).toBe(200);
    expect((await send("GET", "/v1/me")).statusCode).toBe(401);
  });

  it("deletes the account only with the password", async () => {
    expect((await send("DELETE", "/v1/me", {})).statusCode).toBe(400);
    expect((await send("DELETE", "/v1/me", { password: "nope" })).statusCode).toBe(403);
    const response = await send("DELETE", "/v1/me", { password });
    expect(response.statusCode).toBe(200);
    expect(response.cookies.find((c) => c.name === "overpass_session")?.value).toBe("");
    const login = await send("POST", "/v1/auth/login", { email: "awa@example.com", password });
    expect(login.statusCode).toBe(401);
  });
});

describe("tokens", () => {
  it("shows a token once, lists it without the secret, and revokes it", async () => {
    const created = await send("POST", "/v1/tokens", { name: "Laptop", usage: "mcp" });
    expect(created.statusCode).toBe(201);
    expect(created.headers["cache-control"]).toBe("no-store");
    const token = String(created.json<Body>().data?.["token"]);
    const list = await send("GET", "/v1/tokens");
    expect(list.body).not.toContain(token);
    const bearer = { authorization: `Bearer ${token}` };
    expect((await app.inject({ url: "/v1/me", headers: bearer })).statusCode).toBe(200);
    const id = String(created.json<Body>().data?.["id"]);
    expect((await send("DELETE", `/v1/tokens/${id}`)).statusCode).toBe(200);
    expect((await app.inject({ url: "/v1/me", headers: bearer })).statusCode).toBe(401);
  });

  it("does not let a token manage tokens or the account", async () => {
    const created = await send("POST", "/v1/tokens", { name: "Laptop", usage: "api" });
    const bearer = { authorization: `Bearer ${String(created.json<Body>().data?.["token"])}` };
    const attempt = await app.inject({
      method: "POST",
      url: "/v1/tokens",
      payload: { name: "x", usage: "api" },
      headers: bearer,
    });
    expect(attempt.statusCode).toBe(401);
  });

  it("answers 400 for a malformed id and 404 for another user's token", async () => {
    expect((await send("DELETE", "/v1/tokens/not-a-uuid")).statusCode).toBe(400);
    const other = await registerAccount(app, "ali@example.com");
    const created = await send("POST", "/v1/tokens", { name: "Laptop", usage: "mcp" }, other);
    const id = String(created.json<Body>().data?.["id"]);
    expect((await send("DELETE", `/v1/tokens/${id}`)).statusCode).toBe(404);
  });
});
