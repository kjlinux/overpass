import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import { migrateUp, migrationsDirectory } from "./migrations.js";
import type { SqlExecutor } from "./migrations.js";

/** Drizzle database shared by node-postgres in production and PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT>;

export type DatabaseConnection = {
  db: Database;
  executor: SqlExecutor;
  close: () => Promise<void>;
};

function createPgExecutor(pool: pg.Pool): SqlExecutor {
  return {
    exec: async (sql) => {
      await pool.query(sql);
    },
    query: async <Row>(sql: string, params?: unknown[]) =>
      (await pool.query(sql, params)).rows as Row[],
  };
}

/** Opens a pool whose sessions always speak UTC. */
export function connectDatabase(url: string): DatabaseConnection {
  const pool = new pg.Pool({ connectionString: url, options: "-c TimeZone=UTC" });
  return { db: drizzle(pool), executor: createPgExecutor(pool), close: () => pool.end() };
}

async function createPgliteFallback(): Promise<DatabaseConnection> {
  const dataDir = "./.data/pglite";
  mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  const executor: SqlExecutor = {
    exec: async (sql) => {
      await pglite.exec(sql);
    },
    query: async <Row>(sql: string, params?: unknown[]) =>
      (await pglite.query<Row>(sql, params)).rows,
  };
  await migrateUp(executor, migrationsDirectory);
  return {
    db: drizzlePglite(pglite) as unknown as Database,
    executor,
    close: () => pglite.close(),
  };
}

/** Connects to PostgreSQL, falling back to embedded PGlite in development. */
export async function connectOrFallbackDatabase(
  url: string,
  nodeEnv: string,
): Promise<DatabaseConnection> {
  if (nodeEnv !== "development") {
    return connectDatabase(url);
  }
  const pool = new pg.Pool({
    connectionString: url,
    options: "-c TimeZone=UTC",
    connectionTimeoutMillis: 1000,
  });
  try {
    const client = await pool.connect();
    client.release();
    return { db: drizzle(pool), executor: createPgExecutor(pool), close: () => pool.end() };
  } catch {
    await pool.end().catch(() => {});
    return createPgliteFallback();
  }
}
