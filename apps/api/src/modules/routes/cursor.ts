import { z } from "zod";
import { AppError } from "../../http/app-error.js";
import type { Cursor } from "./model.js";

const cursorSchema = z.union([
  z.object({ mode: z.literal("date"), key: z.iso.datetime(), id: z.uuid() }),
  z.object({ mode: z.literal("rank"), key: z.number(), id: z.uuid() }),
]);

/** Opaque to clients; it only carries the sort key and id of the last row served. */
export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/** Decodes a cursor for the expected mode, or answers 400 cursor_invalid. */
export function decodeCursor(value: string, mode: Cursor["mode"]): Cursor {
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    if (parsed.mode === mode) return parsed;
  } catch {
    // An unreadable cursor is the client's mistake, reported below like a wrong mode.
  }
  throw new AppError("validation_failed", 400, { cursor: "cursor_invalid" });
}
