import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateDown, migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

let pg: PGlite;
let executor: SqlExecutor;

async function tables(): Promise<string[]> {
  const rows = await executor.query<{ name: string }>(
    "select table_name as name from information_schema.tables where table_schema = 'public' order by 1",
  );
  return rows.map((row) => row.name);
}

beforeEach(() => {
  pg = new PGlite();
  executor = pgliteExecutor(pg);
});
afterEach(() => pg.close());

describe("migrations", () => {
  it("creates the accounts tables and records the version", async () => {
    const applied = await migrateUp(executor, migrationsDirectory);
    expect(applied).toEqual([
      "0001_accounts",
      "0002_rate_limits",
      "0003_routes",
      "0004_checks",
      "0005_service_countries",
      "0006_sandbox",
      "0007_sent_order",
      "0008_discussions",
      "0009_ranking",
      "0010_requests",
      "0011_route_source_thread",
    ]);
    expect(await tables()).toEqual([
      "api_tokens",
      "checks",
      "member_points",
      "potholes",
      "rate_limit_counters",
      "replies",
      "reply_votes",
      "reports",
      "route_versions",
      "routes",
      "sandbox_deliveries",
      "sandbox_events",
      "sandbox_keys",
      "sandbox_objects",
      "schema_migrations",
      "service_countries",
      "service_proposals",
      "services",
      "simulator_votes",
      "threads",
      "topics",
      "user_stacks",
      "users",
    ]);
  });

  it("does nothing when every migration is already applied", async () => {
    await migrateUp(executor, migrationsDirectory);
    expect(await migrateUp(executor, migrationsDirectory)).toEqual([]);
  });

  it("reverts the last migration and can apply it again", async () => {
    await migrateUp(executor, migrationsDirectory);
    expect(await migrateDown(executor, migrationsDirectory, 11)).toEqual([
      "0011_route_source_thread",
      "0010_requests",
      "0009_ranking",
      "0008_discussions",
      "0007_sent_order",
      "0006_sandbox",
      "0005_service_countries",
      "0004_checks",
      "0003_routes",
      "0002_rate_limits",
      "0001_accounts",
    ]);
    expect(await tables()).toEqual(["schema_migrations"]);
    expect(await migrateUp(executor, migrationsDirectory)).toHaveLength(11);
  });

  it("seeds the six translated discussion themes in their order", async () => {
    await migrateUp(executor, migrationsDirectory);
    const rows = await executor.query<{ slug: string; fr: string; en: string }>(
      "select slug, names->>'fr' as fr, names->>'en' as en from topics order by position",
    );
    expect(rows.map((row) => row.slug)).toEqual([
      "integrations",
      "cloud",
      "tools-ai",
      "career",
      "projects",
      "events",
    ]);
    expect(rows[0]).toMatchObject({ fr: "Intégrations et API", en: "Integrations and APIs" });
    expect(rows.every((row) => row.fr.length > 0 && row.en.length > 0)).toBe(true);
  });

  it("stores identifiers as UUID and dates as timestamptz", async () => {
    await migrateUp(executor, migrationsDirectory);
    const columns = await executor.query<{ column_name: string; data_type: string }>(
      "select column_name, data_type from information_schema.columns where table_name = 'users' and column_name in ('id', 'created_at') order by 1",
    );
    expect(columns).toEqual([
      { column_name: "created_at", data_type: "timestamp with time zone" },
      { column_name: "id", data_type: "uuid" },
    ]);
  });

  it("removes stacks and tokens with their user", async () => {
    await migrateUp(executor, migrationsDirectory);
    await executor.query(
      "insert into users (id, email, password_hash, handle, country) values ('00000000-0000-4000-8000-000000000001', 'a@b.co', 'h', 'dev-a', 'CI')",
    );
    await executor.query(
      "insert into user_stacks (user_id, stack) values ('00000000-0000-4000-8000-000000000001', 'laravel')",
    );
    await executor.query("delete from users");
    expect(await executor.query("select * from user_stacks")).toEqual([]);
  });
});
