import type { Service } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let author: string;
let awa: string;
let kofi: string;

const wave = async (): Promise<Service | undefined> =>
  ((await call(app, "GET", "/v1/services")).body.data as unknown as Service[]).find(
    (service) => service.slug === "wave",
  );
const check = (cookie: string, routeId: string) =>
  call(app, "POST", `/v1/routes/${routeId}/checks`, {
    cookie,
    payload: { country: "UG", environment: "production" },
  });

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  author = await registerAccount(app, "author@example.com");
  awa = await registerAccount(app, "awa@example.com");
  kofi = await registerAccount(app, "kofi@example.com");
});
afterEach(() => close());

describe("members complete the coverage map", () => {
  it("confirms a candidate country once a route of the service there turns clear", async () => {
    const routeId = await publishRoute(app, author, { country: "UG" });
    await check(awa, routeId);
    expect((await wave())?.countries).not.toContain("UG");
    await check(kofi, routeId);
    const coverage = (await wave())?.coverage.find((entry) => entry.country === "UG");
    expect(coverage).toMatchObject({ basis: "community", routeId, source: null });
  });

  it("adds a country no source listed", async () => {
    const routeId = await publishRoute(app, author, { country: "NG" });
    await check(awa, routeId);
    await check(kofi, routeId);
    expect((await wave())?.countries).toContain("NG");
  });

  it("keeps a source confirmation when a route there turns clear too", async () => {
    const routeId = await publishRoute(app, author, { country: "SN" });
    await check(awa, routeId);
    await check(kofi, routeId);
    const coverage = (await wave())?.coverage.find((entry) => entry.country === "SN");
    expect(coverage).toMatchObject({ basis: "source" });
  });
});
