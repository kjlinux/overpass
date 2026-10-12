import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import type { SqlExecutor } from "./migrations.js";

/** Drizzle database shared by node-postgres in production and PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT>;

export type DatabaseConnection = {
  db: Database;
  executor: SqlExecutor;
  close: () => Promise<void>;
};

/** Opens a pool whose sessions always speak UTC. */
export function connectDatabase(url: string): DatabaseConnection {
  const pool = new pg.Pool({ connectionString: url, options: "-c TimeZone=UTC" });
  const executor: SqlExecutor = {
    exec: async (sql) => {
      await pool.query(sql);
    },
    query: async <Row>(sql: string, params?: unknown[]) =>
      (await pool.query(sql, params)).rows as Row[],
  };
  return { db: drizzle(pool), executor, close: () => pool.end() };
}
