import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, sampleRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let author: string;
let awa: string;
const unknownId = "00000000-0000-4000-8000-000000000099";

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  awa = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

describe("edge cases of writing itineraries", () => {
  it("answers 404 for a translation of an unknown itinerary", async () => {
    const response = await call(app, "POST", "/v1/routes", {
      cookie: author,
      payload: { ...sampleRoute, language: "en", translationOf: unknownId },
    });
    expect(response.status).toBe(404);
  });

  it("moves an itinerary to another service, and refuses an unknown one", async () => {
    const id = await publishRoute(app, author);
    const moved = await call(app, "PATCH", `/v1/routes/${id}`, {
      cookie: author,
      payload: { service: "cinetpay" },
    });
    expect(moved.body.data).toMatchObject({ service: { slug: "cinetpay" }, version: 2 });
    const unknown = await call(app, "PATCH", `/v1/routes/${id}`, {
      cookie: author,
      payload: { service: "unknown-pay" },
    });
    expect(unknown.status).toBe(400);
  });

  it("answers 404 when editing or deleting a deleted itinerary", async () => {
    const id = await publishRoute(app, author);
    await call(app, "DELETE", `/v1/routes/${id}`, { cookie: author });
    const patch = { cookie: author, payload: { title: "Un titre qui arrive trop tard" } };
    expect((await call(app, "PATCH", `/v1/routes/${id}`, patch)).status).toBe(404);
    expect((await call(app, "DELETE", `/v1/routes/${id}`, { cookie: author })).status).toBe(404);
  });

  it("filters the itineraries reported broken", async () => {
    const id = await publishRoute(app, author);
    const kofi = await registerAccount(app, "kofi@example.com");
    for (const [cookie, description] of [
      [awa, "Le webhook arrive deux fois."],
      [kofi, "La session refuse une URL en HTTP."],
    ] as const) {
      await call(app, "POST", `/v1/routes/${id}/potholes`, { cookie, payload: { description } });
    }
    const broken = (await call(app, "GET", "/v1/routes?state=broken")).body.data;
    expect(broken?.items).toEqual([expect.objectContaining({ id, state: "broken" })]);
  });
});

describe("edge cases of potholes", () => {
  it("refuses to reopen a resolved pothole when the reporter has another unresolved one", async () => {
    const id = await publishRoute(app, author);
    const report = (description: string) =>
      call(app, "POST", `/v1/routes/${id}/potholes`, { cookie: awa, payload: { description } });
    const first = await report("Le webhook arrive deux fois.");
    const firstId = String(first.body.data?.id);
    await call(app, "PATCH", `/v1/potholes/${firstId}`, {
      cookie: author,
      payload: { status: "resolved" },
    });
    await report("La session refuse une URL en HTTP.");
    const reopened = await call(app, "PATCH", `/v1/potholes/${firstId}`, {
      cookie: author,
      payload: { status: "confirmed" },
    });
    expect(reopened.status).toBe(409);
    expect(reopened.body.error?.code).toBe("pothole_exists");
  });
});
