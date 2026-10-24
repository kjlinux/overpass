import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { moderateRoute, registerAdmin } from "../../testing-admin.js";
import { openThread, readThread, replyTo } from "../../testing-discussions.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;
let helper: string;
let admin: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  helper = await registerAccount(app, "helper@example.com");
  admin = await registerAdmin(app, db, "admin@example.com");
});
afterEach(() => close());

async function routeFromThread(): Promise<{ thread: string; route: string }> {
  const thread = await openThread(app, author);
  const reply = await replyTo(app, helper, thread);
  await call(app, "POST", `/v1/threads/${thread}/accept`, {
    cookie: author,
    payload: { reply },
  });
  const route = await publishRoute(app, author, { sourceThread: thread });
  return { thread, route };
}

describe("a thread whose itinerary is hidden", () => {
  it("no longer links to it, and the thread still cannot be turned into a second one", async () => {
    const { thread, route } = await routeFromThread();
    expect((await readThread(app, thread)).body.data?.transformedRoute).toBe(route);
    await moderateRoute(app, admin, route, "hide");
    for (const cookie of [undefined, helper, author, admin]) {
      expect((await readThread(app, thread, cookie)).body.data?.transformedRoute).toBeNull();
    }
    const again = await call(app, "POST", "/v1/routes", {
      cookie: author,
      payload: {
        service: "wave",
        country: "CI",
        stack: "laravel",
        language: "fr",
        title: "Une seconde fiche depuis le même fil",
        sourceThread: thread,
      },
    });
    expect(again.body.error?.code).toBe("already_transformed");
  });
});

describe("coverage confirmed by a hidden itinerary", () => {
  async function confirmAngola(): Promise<string> {
    const id = await publishRoute(app, author, { country: "AO" });
    for (const cookie of [helper, admin]) {
      await call(app, "POST", `/v1/routes/${id}/checks`, {
        cookie,
        payload: { country: "AO", environment: "production" },
      });
    }
    return id;
  }

  const countries = async () =>
    (await call(app, "GET", "/v1/stats")).body.data?.countries as string[];
  const waveCountries = async () => {
    const services = (await call(app, "GET", "/v1/services")).body.data as unknown as {
      slug: string;
      countries: string[];
    }[];
    return services.find((service) => service.slug === "wave")?.countries ?? [];
  };

  it("stops counting while hidden and comes back on restore", async () => {
    const id = await confirmAngola();
    expect(await countries()).toContain("AO");
    expect(await waveCountries()).toContain("AO");
    await moderateRoute(app, admin, id, "hide");
    expect(await countries()).not.toContain("AO");
    expect(await waveCountries()).not.toContain("AO");
    await moderateRoute(app, admin, id, "restore");
    expect(await countries()).toContain("AO");
    expect(await waveCountries()).toContain("AO");
  });
});

describe("translating a hidden itinerary", () => {
  const translate = (cookie: string, id: string) =>
    call(app, "POST", "/v1/routes", {
      cookie,
      payload: {
        service: "wave",
        country: "CI",
        stack: "laravel",
        language: "en",
        title: "Collect a Wave Checkout payment from Laravel",
        translationOf: id,
      },
    });

  it("answers 404 to members, 409 to its author and lets admins translate it", async () => {
    const id = await publishRoute(app, author);
    await moderateRoute(app, admin, id, "hide");
    expect((await translate(helper, id)).status).toBe(404);
    const own = await translate(author, id);
    expect([own.status, own.body.error?.code]).toEqual([409, "content_unavailable"]);
    expect((await translate(admin, id)).status).toBe(201);
  });
});
