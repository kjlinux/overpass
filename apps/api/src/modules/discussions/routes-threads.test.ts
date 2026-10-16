import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { itemsOf, openThread, readThread, replyTo, sampleThread } from "../../testing-discussions.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let clock: ReturnType<typeof testClock>;
let awa: string;
let moussa: string;

beforeEach(async () => {
  clock = testClock();
  ({ app, close } = await createTestApp({ now: clock.now }));
  awa = await registerAccount(app, "awa@example.com");
  moussa = await registerAccount(app, "moussa@example.com", "SN");
});
afterEach(() => close());

describe("GET /v1/topics", () => {
  it("lists the six themes in order, translated by the language header", async () => {
    const fr = (await call(app, "GET", "/v1/topics")).body.data as unknown as { name: string }[];
    expect(fr.map((topic) => topic.name)).toEqual([
      "Intégrations et API",
      "Cloud et déploiement",
      "Outils et IA",
      "Carrière et freelance",
      "Projets et entraide",
      "Événements et communautés",
    ]);
    const en = await call(app, "GET", "/v1/topics", { language: "en" });
    expect(en.body.data).toContainEqual(
      expect.objectContaining({ slug: "career", name: "Career and freelancing", threads: 0 }),
    );
  });
});

describe("POST /v1/threads", () => {
  it("requires a session and validates the fields", async () => {
    expect((await call(app, "POST", "/v1/threads", { payload: sampleThread })).status).toBe(401);
    const invalid = await call(app, "POST", "/v1/threads", {
      cookie: awa,
      payload: { ...sampleThread, topic: "politics", title: "court" },
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatchObject({ code: "validation_failed" });
  });

  it("creates an open thread with its tags", async () => {
    const created = await call(app, "POST", "/v1/threads", { cookie: awa, payload: sampleThread });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      topic: "career",
      state: "open",
      status: "visible",
      country: "CI",
      stack: "laravel",
      replies: 0,
      createdAt: "2026-10-13T12:00:00.000Z",
      viewer: { isAuthor: true, canTransform: false },
    });
  });

  it("masks secrets pasted in the error, the code and the text before storing them", async () => {
    const key = "wave_sn_prod_YhUNAUh7SY8w2A4gBLGTEVR3RkQhWaWZ";
    const id = await openThread(app, awa, {
      topic: "integrations",
      content: `Mon appel échoue avec la clé ${key}.`,
      errorText: `401 Unauthorized for Bearer ${key}`,
      codeText: `curl -H "Authorization: Bearer ${key}" https://api.wave.com/v1/checkout/sessions`,
    });
    const detail = JSON.stringify((await readThread(app, id)).body.data);
    expect(detail).not.toContain("YhUNAUh7SY8w2A4gBLGTEVR3RkQhWaWZ");
    expect(detail).toContain("https://api.wave.com/v1/checkout/sessions");
  });
});

describe("questions asked from a route", () => {
  it("lands in Integrations with the service and country of the route", async () => {
    const routeId = await publishRoute(app, moussa, { country: "SN" });
    const id = await openThread(app, awa, { topic: "career", route: routeId, country: "CI" });
    const detail = (await readThread(app, id)).body.data;
    expect(detail).toMatchObject({
      topic: "integrations",
      country: "SN",
      service: { slug: "wave", name: "Wave" },
      route: { id: routeId, title: expect.any(String) as string },
    });
  });

  it("answers 404 for an unknown route", async () => {
    const response = await call(app, "POST", "/v1/threads", {
      cookie: awa,
      payload: { ...sampleThread, route: "00000000-0000-4000-8000-000000000099" },
    });
    expect(response.status).toBe(404);
  });

  it("lists the open and resolved questions of a route", async () => {
    const routeId = await publishRoute(app, moussa);
    const id = await openThread(app, awa, { route: routeId });
    await openThread(app, awa, { title: "Une autre question sans fiche liée" });
    const listed = await call(app, "GET", `/v1/threads?route=${routeId}&state=open`);
    expect(itemsOf(listed.body).map((item) => item.id)).toEqual([id]);
    const resolved = await call(app, "GET", `/v1/threads?route=${routeId}&state=resolved`);
    expect(itemsOf(resolved.body)).toEqual([]);
  });
});

describe("GET /v1/threads", () => {
  it("filters by theme, country, stack and language, latest activity first", async () => {
    const first = await openThread(app, awa);
    clock.advanceDays(1);
    const second = await openThread(app, moussa, { topic: "cloud", country: "SN", stack: "django" });
    clock.advanceDays(1);
    await replyTo(app, moussa, first);
    const all = itemsOf((await call(app, "GET", "/v1/threads")).body).map((item) => item.id);
    expect(all).toEqual([first, second]);
    const cloud = await call(app, "GET", "/v1/threads?topic=cloud&country=SN&stack=django");
    expect(itemsOf(cloud.body).map((item) => item.id)).toEqual([second]);
    const english = await call(app, "GET", "/v1/threads?language=en");
    expect(itemsOf(english.body)).toEqual([]);
  });

  it("pages with an opaque cursor and rejects a forged one", async () => {
    for (const n of [1, 2, 3]) {
      await openThread(app, awa, { title: `Question numéro ${String(n)} du fil` });
      clock.advanceDays(1);
    }
    const page = (await call(app, "GET", "/v1/threads?limit=2")).body.data;
    expect(itemsOf({ data: page, error: null })).toHaveLength(2);
    const next = await call(app, "GET", `/v1/threads?limit=2&cursor=${String(page?.nextCursor)}`);
    expect(itemsOf(next.body)).toHaveLength(1);
    expect(next.body.data?.nextCursor).toBeNull();
    expect((await call(app, "GET", "/v1/threads?cursor=abc")).status).toBe(400);
  });
});

describe("POST /v1/threads/:id/replies", () => {
  it("adds a reply shown in the detail and counted in the list", async () => {
    const id = await openThread(app, awa);
    const reply = await call(app, "POST", `/v1/threads/${id}/replies`, {
      cookie: moussa,
      payload: { content: "Comptez vos charges et un jour de prospection par semaine." },
    });
    expect(reply.status).toBe(201);
    const detail = (await readThread(app, id, awa)).body;
    expect(itemsOf(detail)).toEqual([
      expect.objectContaining({ useful: 0, accepted: false, status: "visible" }),
    ]);
    expect(detail.data?.replies).toBe(1);
  });

  it("refuses an empty reply and an unknown thread", async () => {
    const id = await openThread(app, awa);
    const empty = await call(app, "POST", `/v1/threads/${id}/replies`, {
      cookie: moussa,
      payload: { content: "  " },
    });
    expect(empty.status).toBe(400);
    const unknown = await call(app, "POST", "/v1/threads/00000000-0000-4000-8000-000000000099/replies", {
      cookie: moussa,
      payload: { content: "Bonjour" },
    });
    expect(unknown.status).toBe(404);
  });
});
