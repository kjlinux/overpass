import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "./client.js";
import { migrateUp, migrationsDirectory } from "./migrations.js";
import type { SqlExecutor } from "./migrations.js";

/** Adapts an in-process PGlite instance to the migration runner. */
export function pgliteExecutor(pg: PGlite): SqlExecutor {
  return {
    exec: async (sql) => {
      await pg.exec(sql);
    },
    query: async <Row>(sql: string, params?: unknown[]) => (await pg.query<Row>(sql, params)).rows,
  };
}

/** A migrated, throw-away PostgreSQL for tests, with no server to run. */
export async function createTestDatabase(): Promise<{ db: Database; close: () => Promise<void> }> {
  const pg = new PGlite();
  await migrateUp(pgliteExecutor(pg), migrationsDirectory);
  return { db: drizzle(pg) as unknown as Database, close: () => pg.close() };
}
