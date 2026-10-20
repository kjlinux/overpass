import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestApp,
  password,
  registerAccount,
  sessionCookie,
  webOrigin,
} from "../../testing.js";

type Body = { data: Record<string, unknown> | Record<string, unknown>[] | null };

const day = 24 * 60 * 60 * 1000;
let clock = new Date("2026-10-20T08:00:00Z");
let app: FastifyInstance;
let close: () => Promise<void>;
let cookie: string;

beforeEach(async () => {
  clock = new Date("2026-10-20T08:00:00Z");
  ({ app, close } = await createTestApp({ now: () => clock }));
  cookie = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

const send = (method: "POST" | "GET", url: string, payload?: object) =>
  app.inject({
    method,
    url,
    ...(payload ? { payload } : {}),
    headers: { origin: webOrigin, cookie },
  });

const meWith = async (token: string) =>
  (await app.inject({ url: "/v1/me", headers: { authorization: `Bearer ${token}` } })).statusCode;

// The session outlives no 90-day jump, so the member signs in again to read the list.
async function signInAgain(): Promise<void> {
  const payload = { email: "awa@example.com", password };
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/login",
    payload,
    headers: { origin: webOrigin },
  });
  cookie = sessionCookie(response);
}

describe("personal token lifetime", () => {
  it("states an expiry 90 days after creation, at creation and in the list", async () => {
    const created = (
      await send("POST", "/v1/tokens", { name: "Laptop", usage: "mcp" })
    ).json<Body>();
    expect(created.data).toMatchObject({ expiresAt: "2027-01-18T08:00:00.000Z" });
    const list = (await send("GET", "/v1/tokens")).json<Body>();
    expect(list.data).toMatchObject([{ name: "Laptop", expiresAt: "2027-01-18T08:00:00.000Z" }]);
  });

  it("works until its expiry, then is refused and leaves the list", async () => {
    const created = (
      await send("POST", "/v1/tokens", { name: "Laptop", usage: "api" })
    ).json<Body>();
    const token = String((created.data as Record<string, unknown>)["token"]);
    clock = new Date(clock.getTime() + 90 * day - 1000);
    expect(await meWith(token)).toBe(200);
    clock = new Date(clock.getTime() + 2000);
    expect(await meWith(token)).toBe(401);
    await signInAgain();
    expect((await send("GET", "/v1/tokens")).json<Body>().data).toEqual([]);
  });
});
