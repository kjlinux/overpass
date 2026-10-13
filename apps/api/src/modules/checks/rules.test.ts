import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, publishRoute, stateOf, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let clock: ReturnType<typeof testClock>;
let author: string;
let awa: string;
let kofi: string;
let routeId: string;

const check = (cookie: string, country = "CI") =>
  call(app, "POST", `/v1/routes/${routeId}/checks`, {
    cookie,
    payload: { country, environment: "production" },
  });
const report = (cookie: string, description = "Le webhook arrive deux fois.") =>
  call(app, "POST", `/v1/routes/${routeId}/potholes`, { cookie, payload: { description } });

beforeEach(async () => {
  clock = testClock();
  ({ app, close } = await createTestApp({ now: clock.now }));
  author = await registerAccount(app, "author@example.com");
  awa = await registerAccount(app, "awa@example.com");
  kofi = await registerAccount(app, "kofi@example.com");
  routeId = await publishRoute(app, author);
});
afterEach(() => close());

describe("clear road: two checks by distinct accounts within 90 days", () => {
  it("starts to verify, stays to verify after one check, turns clear after a second account", async () => {
    expect(await stateOf(app, routeId)).toBe("to_verify");
    expect((await check(awa)).status).toBe(201);
    expect(await stateOf(app, routeId)).toBe("to_verify");
    expect((await check(kofi, "SN")).status).toBe(201);
    expect(await stateOf(app, routeId)).toBe("clear");
  });

  it("does not count the same account twice", async () => {
    await check(awa);
    clock.advanceDays(31);
    await check(awa);
    expect(await stateOf(app, routeId)).toBe("to_verify");
  });
});

describe("to verify: no recent check", () => {
  it("falls back to verify once the checks are older than 90 days", async () => {
    await check(awa);
    await check(kofi);
    clock.advanceDays(90);
    expect(await stateOf(app, routeId)).toBe("clear");
    clock.advanceDays(1);
    expect(await stateOf(app, routeId)).toBe("to_verify");
  });
});

describe("reported broken: two unresolved potholes", () => {
  it("turns broken on the second report, even when recently checked", async () => {
    await check(awa);
    await check(kofi);
    expect((await report(awa)).status).toBe(201);
    expect(await stateOf(app, routeId)).toBe("clear");
    await report(kofi, "La session refuse une URL de retour en HTTP.");
    expect(await stateOf(app, routeId)).toBe("broken");
  });

  it("leaves broken when the author resolves a pothole", async () => {
    const first = await report(awa);
    await report(kofi, "La session refuse une URL de retour en HTTP.");
    const potholeId = String(first.body.data?.id);
    const resolved = await call(app, "PATCH", `/v1/potholes/${potholeId}`, {
      cookie: author,
      payload: { status: "resolved" },
    });
    expect(resolved.status).toBe(200);
    expect(await stateOf(app, routeId)).toBe("to_verify");
  });

  it("counts a confirmed pothole as unresolved", async () => {
    const first = await report(awa);
    await report(kofi, "La session refuse une URL de retour en HTTP.");
    await call(app, "PATCH", `/v1/potholes/${String(first.body.data?.id)}`, {
      cookie: author,
      payload: { status: "confirmed" },
    });
    expect(await stateOf(app, routeId)).toBe("broken");
  });
});

describe("one check per account and per route every 30 days", () => {
  it("refuses a second check within 30 days", async () => {
    await check(awa);
    clock.advanceDays(29);
    const again = await check(awa);
    expect(again.status).toBe(409);
    expect(again.body.error?.code).toBe("check_too_soon");
  });

  it("accepts a new check after 30 days", async () => {
    await check(awa);
    clock.advanceDays(30);
    expect((await check(awa)).status).toBe(201);
  });
});

describe("the author cannot check their own route", () => {
  it("refuses the author with own_route", async () => {
    const response = await check(author);
    expect(response.status).toBe(403);
    expect(response.body.error?.code).toBe("own_route");
  });
});
