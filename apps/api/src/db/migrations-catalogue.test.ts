import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateDown, migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

let pg: PGlite;
let executor: SqlExecutor;

const added = [
  "africas-talking-sms",
  "africas-talking-ussd",
  "airtel-money",
  "flutterwave",
  "m-pesa",
  "mtn-momo",
  "orange-sms",
  "paystack",
  "termii",
];

beforeEach(async () => {
  pg = new PGlite();
  executor = pgliteExecutor(pg);
  await migrateUp(executor, migrationsDirectory);
});
afterEach(() => pg.close());

describe("service catalogue growth migration", () => {
  it("adds nine services without simulator across the three categories", async () => {
    const rows = await executor.query<{ slug: string; category: string; simulated: boolean }>(
      "select slug, category, simulated from services where slug = any($1) order by slug",
      [added],
    );
    expect(rows.map((row) => row.slug)).toEqual(added);
    expect(rows.every((row) => !row.simulated)).toBe(true);
    expect(rows.filter((row) => row.category === "sms").map((row) => row.slug)).toEqual([
      "africas-talking-sms",
      "orange-sms",
      "termii",
    ]);
    expect(rows.filter((row) => row.category === "ussd").map((row) => row.slug)).toEqual([
      "africas-talking-ussd",
    ]);
  });

  it("dates and sources every candidate country of the added services", async () => {
    const rows = await executor.query<{ slug: string; source: string; consulted: string }>(
      `select s.slug, c.source, c.consulted_on::text as consulted
       from service_countries c join services s on s.id = c.service_id where s.slug = any($1)`,
      [added],
    );
    expect(rows.length).toBeGreaterThanOrEqual(60);
    expect(rows.every((row) => row.source.startsWith("https://"))).toBe(true);
    expect(rows.every((row) => row.consulted === "2026-10-23")).toBe(true);
  });

  it("confirms only the countries read on an official portal that day", async () => {
    const rows = await executor.query<{ slug: string; country: string }>(
      `select s.slug, c.country from service_countries c join services s on s.id = c.service_id
       where s.slug = any($1) and c.confirmed order by s.slug, c.country`,
      [added],
    );
    expect(rows.filter((row) => row.slug === "orange-sms")).toHaveLength(11);
    expect(rows.filter((row) => row.slug !== "orange-sms")).toEqual([
      { slug: "m-pesa", country: "KE" },
      { slug: "paystack", country: "NG" },
      { slug: "termii", country: "NG" },
    ]);
  });

  it("rolls back to the six services of the first catalogue", async () => {
    await migrateDown(executor, migrationsDirectory);
    const [row] = await executor.query<{ count: number }>(
      "select count(*)::int as count from services",
    );
    expect(row?.count).toBe(6);
  });
});
