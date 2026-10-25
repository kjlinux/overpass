import { readdirSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateDown, migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor, testPglite } from "./testing.js";
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
  pg = await testPglite();
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
    const bySlug = (slug: string) => rows.filter((row) => row.slug === slug).map((r) => r.country);
    expect(bySlug("orange-sms")).toHaveLength(11);
    expect(bySlug("airtel-money")).toHaveLength(13);
    expect(bySlug("airtel-money")).not.toContain("NG");
    expect(bySlug("paystack")).toEqual(["CI", "EG", "GH", "KE", "NG", "RW", "ZA"]);
    expect(bySlug("flutterwave")).toEqual(["GH", "KE", "NG", "RW", "TZ", "UG", "ZA", "ZM"]);
    expect(bySlug("africas-talking-sms")).toEqual(["KE"]);
    expect(bySlug("africas-talking-ussd")).toEqual([]);
    expect(bySlug("mtn-momo")).toEqual([]);
    expect(bySlug("m-pesa")).toEqual(["KE"]);
    expect(bySlug("termii")).toEqual(["NG"]);
  });

  it("rolls back to the six services even once content references the new ones", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    await executor.query(
      "insert into users (id, email, password_hash, handle, country) values ($1, 'a@b.co', 'h', 'dev-a', 'CI')",
      [userId],
    );
    await executor.query(
      `insert into routes (author_id, service_id, country, stack, language, title, content)
       select $1, id, 'GH', 'nodejs', 'en', 'Collect MTN MoMo payments', 'Body' from services where slug = 'mtn-momo'`,
      [userId],
    );
    await executor.query(
      `insert into threads (author_id, topic, title, content, language, service_id)
       select $1, 'integrations', 'MTN MoMo sandbox question', 'Body', 'en', id from services where slug = 'mtn-momo'`,
      [userId],
    );
    // Steps back to 0019 whatever migrations come after this one.
    const since = readdirSync(migrationsDirectory).filter(
      (name) => /^[0-9]{4}_[a-z0-9_]+[.]up[.]sql$/.test(name) && name >= "0020",
    );
    await migrateDown(executor, migrationsDirectory, since.length);
    expect(await executor.query("select 1 from threads")).toHaveLength(1);
    const [row] = await executor.query<{ count: number }>(
      "select count(*)::int as count from services",
    );
    expect(row?.count).toBe(6);
  });
});
