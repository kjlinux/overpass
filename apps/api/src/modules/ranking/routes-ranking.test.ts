import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { openThread, replyTo } from "../../testing-discussions.js";
import { createTestApp, handleOf, password, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;
let awa: string;
let moussa: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  awa = await registerAccount(app, "awa@example.com");
  moussa = await registerAccount(app, "moussa@example.com", "SN");
});
afterEach(() => close());

async function developers(query = "") {
  return (await call(app, "GET", `/v1/ranking/developers${query}`)).body.data as unknown as {
    handle: string;
    country: string;
    points: number;
    rank: number;
  }[];
}

async function pointsOf(cookie: string): Promise<number> {
  const handle = await handleOf(app, cookie);
  return Number((await call(app, "GET", `/v1/users/${handle}`)).body.data?.points);
}

describe("GET /v1/ranking/developers", () => {
  it("is empty before any contribution", async () => {
    expect(await developers()).toEqual([]);
  });

  it("counts a published route 10 and a check 2, in rank order", async () => {
    const routeId = await publishRoute(app, author);
    await call(app, "POST", `/v1/routes/${routeId}/checks`, {
      cookie: awa,
      payload: { country: "CI", environment: "test" },
    });
    expect(await developers()).toEqual([
      { rank: 1, handle: await handleOf(app, author), country: "CI", points: 10 },
      { rank: 2, handle: await handleOf(app, awa), country: "CI", points: 2 },
    ]);
  });

  it("gives 5 to the reporter of a pothole confirmed by the author", async () => {
    const routeId = await publishRoute(app, author);
    const report = await call(app, "POST", `/v1/routes/${routeId}/potholes`, {
      cookie: awa,
      payload: { description: "Le webhook arrive deux fois." },
    });
    expect(await pointsOf(awa)).toBe(0);
    await call(app, "PATCH", `/v1/potholes/${String(report.body.data?.id)}`, {
      cookie: author,
      payload: { status: "confirmed" },
    });
    expect(await pointsOf(awa)).toBe(5);
  });

  it("takes the points back when the route is deleted", async () => {
    const routeId = await publishRoute(app, author);
    expect(await pointsOf(author)).toBe(10);
    await call(app, "DELETE", `/v1/routes/${routeId}`, { cookie: author });
    expect(await pointsOf(author)).toBe(0);
    expect(await developers()).toEqual([]);
  });

  it("filters by country and validates the filter", async () => {
    await publishRoute(app, author);
    await publishRoute(app, moussa, { country: "SN" });
    const senegal = await developers("?country=SN");
    expect(senegal).toEqual([expect.objectContaining({ country: "SN", rank: 1 })]);
    expect((await call(app, "GET", "/v1/ranking/developers?country=FR")).status).toBe(400);
  });
});

describe("GET /v1/ranking/countries", () => {
  it("adds the points of the developers of each country", async () => {
    await publishRoute(app, author);
    await publishRoute(app, awa, { title: "Encaisser avec Wave depuis Django" });
    await publishRoute(app, moussa, { country: "SN" });
    const countries = (await call(app, "GET", "/v1/ranking/countries")).body.data;
    expect(countries).toEqual([
      { rank: 1, country: "CI", points: 20, developers: 2 },
      { rank: 2, country: "SN", points: 10, developers: 1 },
    ]);
  });
});

describe("points cache", () => {
  it("rebuilds a missing entry when a profile is read", async () => {
    await publishRoute(app, author);
    await db.execute(sql`delete from member_points`);
    expect(await pointsOf(author)).toBe(10);
  });

  it("takes back useful votes when the voter deletes the account", async () => {
    const threadId = await openThread(app, author);
    const replyId = await replyTo(app, awa, threadId);
    await call(app, "POST", `/v1/replies/${replyId}/useful`, { cookie: moussa });
    expect(await pointsOf(awa)).toBe(1);
    const deleted = await call(app, "DELETE", "/v1/me", { cookie: moussa, payload: { password } });
    expect(deleted.status).toBe(200);
    expect(await pointsOf(awa)).toBe(0);
  });
});
