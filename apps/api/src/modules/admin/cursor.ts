import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { z } from "zod";
import { AppError } from "../../http/app-error.js";

/** The sort date as PostgreSQL stores it, microseconds included, so no row is ever skipped. */
export type AdminCursor = { at: string; id: string };

const cursorSchema = z.object({
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/),
  id: z.uuid(),
});

export function encodeAdminCursor(cursor: AdminCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/** Decodes a cursor, or answers 400 cursor_invalid. */
export function decodeAdminCursor(value: string): AdminCursor {
  try {
    const raw: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return cursorSchema.parse(raw);
  } catch {
    throw new AppError("validation_failed", 400, { cursor: "cursor_invalid" });
  }
}

/** A timestamp rendered with its full precision, for the cursor of the last row served. */
export const exactAt = (column: SQL): SQL =>
  sql`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
