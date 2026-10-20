import { readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateDown, migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

let pg: PGlite;
let executor: SqlExecutor;
const userId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  pg = new PGlite();
  executor = pgliteExecutor(pg);
});
afterEach(() => pg.close());

async function key(url: string, hash: string): Promise<void> {
  await executor.query(
    `insert into sandbox_keys (user_id, provider, key_hash, prefix, scenario, target, webhook_url, expires_at)
     values ($1, 'wave', $2, 'ovp_test_x', 'success', 'url', $3, now() + interval '1 day')`,
    [userId, hash, url],
  );
}

describe("https only webhooks", () => {
  it("moves the keys that still post to http to the built-in receiver, and keeps https ones", async () => {
    await migrateUp(executor, migrationsDirectory);
    const since = readdirSync(migrationsDirectory).filter(
      (name) => name.endsWith(".up.sql") && name >= "0019",
    );
    await migrateDown(executor, migrationsDirectory, since.length);
    await executor.query(
      `insert into users (id, email, password_hash, handle, country) values ($1, 'a@b.co', 'h', 'dev-a', 'CI')`,
      [userId],
    );
    await key("http://shop.example/hook", "h1");
    await key("https://shop.example/hook", "h2");
    await migrateUp(executor, migrationsDirectory);
    const rows = await executor.query<{ key_hash: string; target: string; webhook_url: string }>(
      "select key_hash, target, webhook_url from sandbox_keys order by key_hash",
    );
    expect(rows).toEqual([
      { key_hash: "h1", target: "inbox", webhook_url: null },
      { key_hash: "h2", target: "url", webhook_url: "https://shop.example/hook" },
    ]);
    await expect(key("http://shop.example/again", "h3")).rejects.toThrow();
  });
});
