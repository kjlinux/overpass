import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "../db/testing.js";
import { postgresCounters, registerRateLimits } from "./index.js";

let app: FastifyInstance;
let close: () => Promise<void>;

beforeEach(async () => {
  const database = await createTestDatabase();
  close = database.close;
  app = Fastify();
  await registerRateLimits(app, postgresCounters(database.db), { max: 2, timeWindow: 60_000 });
  app.get("/plain", () => ({ ok: true }));
  app.get("/own", { config: { rateLimit: { max: 3, timeWindow: 60_000 } } }, () => ({ ok: true }));
});
afterEach(async () => {
  await app.close();
  await close();
});

const statuses = async (url: string, times: number): Promise<number[]> => {
  const codes: number[] = [];
  for (let i = 0; i < times; i++) codes.push((await app.inject({ method: "GET", url })).statusCode);
  return codes;
};

describe("rate limits", () => {
  it("limits a route that declares no budget of its own", async () => {
    expect(await statuses("/plain", 3)).toEqual([200, 200, 429]);
  });

  it("lets requests through when the counter store fails, instead of answering 500", async () => {
    const broken = Fastify();
    const failing = () => Promise.reject(new Error("counter table locked"));
    const counters = { hit: failing, peek: failing, purgeExpired: failing };
    await registerRateLimits(broken, counters, { max: 2, timeWindow: 60_000 });
    broken.get("/plain", () => ({ ok: true }));
    expect((await broken.inject({ method: "GET", url: "/plain" })).statusCode).toBe(200);
    await broken.close();
  });

  it("keeps the budget a route declares for itself", async () => {
    expect(await statuses("/own", 4)).toEqual([200, 200, 200, 429]);
  });
});
