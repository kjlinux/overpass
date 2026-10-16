import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";

export async function rows<Row>(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

export const toDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

export const toDateOrNull = (value: Date | string | null): Date | null =>
  value === null ? null : toDate(value);

export const at = (date: Date): SQL => sql`${date.toISOString()}::timestamptz`;
