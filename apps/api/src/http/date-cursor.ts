import { z } from "zod";
import { AppError } from "./app-error.js";

export type DateCursor = { at: Date; id: string };

const cursorSchema = z.object({ at: z.iso.datetime(), id: z.uuid() });

/** Opaque to clients; it only carries the date and id of the last row served. */
export function encodeDateCursor(cursor: DateCursor): string {
  const json = JSON.stringify({ at: cursor.at.toISOString(), id: cursor.id });
  return Buffer.from(json).toString("base64url");
}

/** Decodes a cursor, or answers 400 cursor_invalid. */
export function decodeDateCursor(value: string): DateCursor {
  try {
    const raw: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const parsed = cursorSchema.parse(raw);
    return { at: new Date(parsed.at), id: parsed.id };
  } catch {
    throw new AppError("validation_failed", 400, { cursor: "cursor_invalid" });
  }
}
