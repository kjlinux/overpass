import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../db/client.js";
import { createTestDatabase } from "../db/testing.js";
import { counterStoreFor, postgresCounters } from "./index.js";
import type { CounterStore } from "./index.js";

let db: Database;
let close: () => Promise<void>;
let counters: CounterStore;

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
  counters = postgresCounters(db);
});
afterEach(() => close());

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("postgres counters", () => {
  it("counts hits inside a window and reports the time left", async () => {
    await counters.hit("login:1.2.3.4", 60_000);
    const second = await counters.hit("login:1.2.3.4", 60_000);
    expect(second.count).toBe(2);
    expect(second.ttlMs).toBeGreaterThan(55_000);
    expect(second.ttlMs).toBeLessThanOrEqual(60_000);
  });

  it("keeps keys apart", async () => {
    await counters.hit("a", 60_000);
    expect((await counters.hit("b", 60_000)).count).toBe(1);
  });

  it("starts a new window once the previous one is over", async () => {
    await counters.hit("a", 30);
    await pause(60);
    expect((await counters.hit("a", 30)).count).toBe(1);
  });

  it("never loses a hit under concurrency", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => counters.hit("a", 60_000)));
    expect(results.map((r) => r.count).sort((x, y) => x - y)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });

  it("peeks without counting", async () => {
    await counters.hit("a", 60_000);
    expect((await counters.peek("a")).count).toBe(1);
    expect((await counters.peek("unknown")).count).toBe(0);
  });

  it("purges finished windows", async () => {
    await counters.hit("old", 10);
    await counters.hit("live", 60_000);
    await pause(30);
    expect(await counters.purgeExpired()).toBe(1);
  });
});

describe("rate-limit store", () => {
  async function server() {
    const app = Fastify();
    await app.register(rateLimit, { global: false, store: counterStoreFor(counters) });
    app.get("/limited", { config: { rateLimit: { max: 2, timeWindow: 60_000 } } }, () => "ok");
    app.get("/other", { config: { rateLimit: { max: 2, timeWindow: 60_000 } } }, () => "ok");
    return app;
  }

  it("shares one budget between two API instances", async () => {
    const [first, second] = [await server(), await server()];
    expect((await first.inject({ url: "/limited" })).statusCode).toBe(200);
    expect((await second.inject({ url: "/limited" })).statusCode).toBe(200);
    expect((await first.inject({ url: "/limited" })).statusCode).toBe(429);
    await Promise.all([first.close(), second.close()]);
  });

  it("gives each route its own budget", async () => {
    const app = await server();
    await app.inject({ url: "/limited" });
    await app.inject({ url: "/limited" });
    expect((await app.inject({ url: "/other" })).statusCode).toBe(200);
    await app.close();
  });
});
