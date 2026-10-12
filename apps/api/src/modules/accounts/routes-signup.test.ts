import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, password, registerAccount, webOrigin } from "../../testing.js";

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
const awa = { email: "Awa@Example.com", password, country: "CI" };
const tokenOf = (text = "") => /#token=([\w.-]+)/.exec(text)?.[1] ?? "";

describe("POST /v1/auth/register", () => {
  it("answers 202 without a session, and the same for an address that has an account", async () => {
    const fresh = await post("/v1/auth/register", awa);
    await registerAccount(app, "ali@example.com");
    const taken = await post("/v1/auth/register", { ...awa, email: "ali@example.com" });
    expect([fresh.statusCode, taken.statusCode]).toEqual([202, 202]);
    expect(taken.body).toBe(fresh.body);
    expect(fresh.cookies).toEqual([]);
  });

  it("answers translated field errors with stable codes", async () => {
    const response = await post(
      "/v1/auth/register",
      { email: "nope", password: "short" },
      { "accept-language": "en" },
    );
    expect(response.statusCode).toBe(400);
    expect(response.json<Body>().error).toMatchObject({
      code: "validation_failed",
      fields: {
        email: { code: "email_invalid" },
        password: { code: "password_too_short" },
        country: { code: "required", message: "This field is required." },
      },
    });
  });

  it("limits sign-up mails per address, so nobody can flood an inbox", async () => {
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        remoteAddress: `10.0.5.${String(i)}`,
        payload: awa,
        headers: { origin: webOrigin },
      });
    }
    const blocked = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      remoteAddress: "10.0.6.1",
      payload: awa,
      headers: { origin: webOrigin },
    });
    expect(blocked.statusCode).toBe(429);
  });
});

describe("POST /v1/auth/confirm", () => {
  it("creates the member from the mailed link and opens an httpOnly session", async () => {
    await post("/v1/auth/register", awa, { "accept-language": "en" });
    const response = await post("/v1/auth/confirm", { token: tokenOf(mailer.sent.at(-1)?.text) });
    expect(response.statusCode).toBe(201);
    const { data } = response.json<Body>();
    expect(data).toMatchObject({ email: "awa@example.com", country: "CI", language: "en" });
    expect(JSON.stringify(data)).not.toMatch(/argon2|passwordHash/);
    const cookie = response.cookies.find((c) => c.name === "overpass_session");
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  });

  it("refuses a forged link", async () => {
    const response = await post("/v1/auth/confirm", { token: "forged.token" });
    expect([response.statusCode, response.json<Body>().error?.["code"]]).toEqual([
      400,
      "signup_invalid",
    ]);
  });
});
