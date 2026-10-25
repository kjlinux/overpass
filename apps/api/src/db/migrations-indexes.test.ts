import { readdirSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateDown, migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor, testPglite } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

let pg: PGlite;
let executor: SqlExecutor;

const filterIndexes = [
  "routes_country_idx",
  "routes_stack_idx",
  "routes_language_idx",
  "threads_topic_idx",
  "threads_country_idx",
  "threads_stack_idx",
  "threads_language_idx",
  "threads_service_idx",
  "threads_accepted_reply_idx",
  "threads_hidden_idx",
  "users_country_idx",
  "checks_checked_at_idx",
  "simulator_votes_user_idx",
  "sandbox_deliveries_key_idx",
];

async function indexes(): Promise<string[]> {
  const rows = await executor.query<{ name: string }>(
    "select indexname as name from pg_indexes where schemaname = 'public'",
  );
  return rows.map((row) => row.name);
}

beforeEach(async () => {
  pg = await testPglite();
  executor = pgliteExecutor(pg);
});
afterEach(() => pg.close());

describe("filter and search indexes", () => {
  it("indexes every column the lists filter on", async () => {
    await migrateUp(executor, migrationsDirectory);
    expect(await indexes()).toEqual(expect.arrayContaining(filterIndexes));
  });

  it("drops them again on rollback", async () => {
    await migrateUp(executor, migrationsDirectory);
    // Steps back to 0015 whatever migrations come after this one.
    const since = readdirSync(migrationsDirectory).filter(
      (name) => name.endsWith(".up.sql") && name >= "0016",
    );
    await migrateDown(executor, migrationsDirectory, since.length);
    const left = await indexes();
    expect(filterIndexes.filter((name) => left.includes(name))).toEqual([]);
  });

  it("lets the planner use the country index on a filtered listing", async () => {
    await migrateUp(executor, migrationsDirectory);
    await executor.query("set enable_seqscan = off");
    const plan = await executor.query<{ "QUERY PLAN": string }>(
      "explain select id from routes where country = 'CI' and deleted_at is null and moderation = 'visible' order by updated_at desc, id desc limit 21",
    );
    expect(plan.map((row) => row["QUERY PLAN"]).join("\n")).toContain("routes_country_idx");
  });
});
