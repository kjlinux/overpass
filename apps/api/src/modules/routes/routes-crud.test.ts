import { routeTemplate } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, sampleRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let author: string;
let awa: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  awa = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

describe("POST /v1/routes", () => {
  it("creates an itinerary from the template of its language", async () => {
    const payload = { ...sampleRoute, content: undefined };
    const created = await call(app, "POST", "/v1/routes", { cookie: author, payload });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      content: routeTemplate("fr"),
      version: 1,
      state: "to_verify",
      service: { slug: "wave", name: "Wave", simulated: true },
    });
  });

  it("requires a session and a known service", async () => {
    expect((await call(app, "POST", "/v1/routes", { payload: sampleRoute })).status).toBe(401);
    const unknown = await call(app, "POST", "/v1/routes", {
      cookie: author,
      payload: { ...sampleRoute, service: "unknown-pay" },
    });
    expect(unknown.status).toBe(400);
  });
});

describe("PATCH /v1/routes/:id", () => {
  it("creates a new version on every change", async () => {
    const id = await publishRoute(app, author);
    const content = "## Prérequis\n\nUne clé d'API.";
    const first = await call(app, "PATCH", `/v1/routes/${id}`, {
      cookie: author,
      payload: { content },
    });
    expect(first.body.data).toMatchObject({ version: 2, content });
    const second = await call(app, "PATCH", `/v1/routes/${id}`, {
      cookie: author,
      payload: { title: "Encaisser avec Wave Checkout en Laravel 12" },
    });
    expect(second.body.data).toMatchObject({ version: 3 });
  });

  it("refuses another account", async () => {
    const id = await publishRoute(app, author);
    const response = await call(app, "PATCH", `/v1/routes/${id}`, {
      cookie: awa,
      payload: { title: "Un titre qui n'est pas le sien" },
    });
    expect(response.status).toBe(403);
  });
});

describe("DELETE /v1/routes/:id", () => {
  it("hides a deleted itinerary from reads and lists", async () => {
    const id = await publishRoute(app, author);
    expect((await call(app, "DELETE", `/v1/routes/${id}`, { cookie: awa })).status).toBe(403);
    expect((await call(app, "DELETE", `/v1/routes/${id}`, { cookie: author })).status).toBe(200);
    expect((await call(app, "GET", `/v1/routes/${id}`)).status).toBe(404);
    const list = (await call(app, "GET", "/v1/routes")).body.data;
    expect(list?.items).toEqual([]);
  });
});

describe("translations", () => {
  it("links the French and English versions and serves the requested language", async () => {
    const fr = await publishRoute(app, author);
    const en = await publishRoute(app, author, {
      language: "en",
      title: "Collect a Wave Checkout payment from Laravel",
      translationOf: fr,
    });
    const read = (await call(app, "GET", `/v1/routes/${fr}?lang=en`)).body.data;
    expect(read).toMatchObject({ id: en, language: "en", fallback: false });
    expect(read?.translations).toEqual(
      expect.arrayContaining([
        { id: fr, language: "fr" },
        { id: en, language: "en" },
      ]),
    );
  });

  it("falls back to the available language", async () => {
    const fr = await publishRoute(app, author);
    const read = (await call(app, "GET", `/v1/routes/${fr}?lang=en`)).body.data;
    expect(read).toMatchObject({ id: fr, language: "fr", fallback: true });
  });

  it("refuses a second version in the same language", async () => {
    const fr = await publishRoute(app, author);
    const response = await call(app, "POST", "/v1/routes", {
      cookie: author,
      payload: { ...sampleRoute, translationOf: fr },
    });
    expect(response.status).toBe(409);
    expect(response.body.error?.code).toBe("translation_exists");
  });
});

describe("GET /v1/services and /v1/me/routes", () => {
  it("lists the services and my itineraries", async () => {
    const services = (await call(app, "GET", "/v1/services")).body.data as unknown as unknown[];
    expect(services).toHaveLength(6);
    const id = await publishRoute(app, author);
    const mine = (await call(app, "GET", "/v1/me/routes", { cookie: author })).body.data;
    expect(mine).toEqual([expect.objectContaining({ id, state: "to_verify" })]);
    expect((await call(app, "GET", "/v1/me/routes", { cookie: awa })).body.data).toEqual([]);
  });

  it("answers 400 for a malformed id and 404 for an unknown one", async () => {
    expect((await call(app, "GET", "/v1/routes/not-a-uuid")).status).toBe(400);
    const unknown = await call(app, "GET", "/v1/routes/00000000-0000-4000-8000-000000000099");
    expect(unknown.status).toBe(404);
  });
});
