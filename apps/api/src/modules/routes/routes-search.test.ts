import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let author: string;

const titles = async (query: string) => {
  const page = (await call(app, "GET", `/v1/routes${query}`)).body.data;
  return (page?.items as { title: string }[]).map((item) => item.title);
};

beforeEach(async () => {
  const clock = testClock();
  ({ app, close } = await createTestApp({ now: clock.now }));
  author = await registerAccount(app, "author@example.com");
  await publishRoute(app, author, { title: "Encaisser un paiement Wave depuis Laravel" });
  clock.advanceDays(1);
  await publishRoute(app, author, {
    service: "cinetpay",
    country: "SN",
    stack: "nodejs",
    title: "Recevoir les webhooks CinetPay avec Node.js",
    content: "Vérifiez la signature des notifications.",
  });
  clock.advanceDays(1);
  await publishRoute(app, author, {
    language: "en",
    country: "SN",
    title: "Collect Wave payments with Django",
    stack: "django",
  });
});
afterEach(() => close());

describe("GET /v1/routes", () => {
  it("lists the newest itineraries first", async () => {
    expect(await titles("")).toEqual([
      "Collect Wave payments with Django",
      "Recevoir les webhooks CinetPay avec Node.js",
      "Encaisser un paiement Wave depuis Laravel",
    ]);
  });

  it("searches the full text in French and in English", async () => {
    expect(await titles("?q=paiements")).toEqual(["Encaisser un paiement Wave depuis Laravel"]);
    expect(await titles("?q=signature")).toEqual(["Recevoir les webhooks CinetPay avec Node.js"]);
    expect(await titles("?q=payment")).toEqual(["Collect Wave payments with Django"]);
  });

  it("filters by service, country, stack, language and state", async () => {
    expect(await titles("?service=cinetpay")).toHaveLength(1);
    expect(await titles("?country=SN")).toHaveLength(2);
    expect(await titles("?stack=laravel")).toEqual(["Encaisser un paiement Wave depuis Laravel"]);
    expect(await titles("?language=en")).toEqual(["Collect Wave payments with Django"]);
    expect(await titles("?state=to_verify")).toHaveLength(3);
    expect(await titles("?state=clear")).toEqual([]);
  });

  it("pages with a cursor without repeating an itinerary", async () => {
    const first = (await call(app, "GET", "/v1/routes?limit=2")).body.data;
    expect(first?.items).toHaveLength(2);
    const cursor = encodeURIComponent(String(first?.nextCursor));
    const second = (await call(app, "GET", `/v1/routes?limit=2&cursor=${cursor}`)).body.data;
    expect(second?.items).toHaveLength(1);
    expect(second?.nextCursor).toBeNull();
  });

  it("pages search results by rank", async () => {
    const first = (await call(app, "GET", "/v1/routes?q=wave&limit=1")).body.data;
    const cursor = encodeURIComponent(String(first?.nextCursor));
    const second = (await call(app, "GET", `/v1/routes?q=wave&limit=1&cursor=${cursor}`)).body;
    const ids = [first?.items, second.data?.items].flat() as { id: string }[];
    expect(new Set(ids.map((item) => item.id)).size).toBe(2);
  });

  it("rejects a rank cursor outside the range of a rank", async () => {
    const forged = Buffer.from(
      JSON.stringify({ mode: "rank", key: 1e39, id: "00000000-0000-4000-8000-000000000001" }),
    ).toString("base64url");
    expect((await call(app, "GET", `/v1/routes?q=wave&cursor=${forged}`)).status).toBe(400);
  });

  it("rejects a forged cursor and an unknown state", async () => {
    expect((await call(app, "GET", "/v1/routes?cursor=forged")).status).toBe(400);
    expect((await call(app, "GET", "/v1/routes?state=open")).status).toBe(400);
  });
});
