import { z } from "zod";
import type { ScoreCursor } from "./model.js";

export { searchQuery } from "@overpass/shared";

const cursorShape = z.object({ score: z.number(), id: z.uuid() });

export function encodeScoreCursor(cursor: ScoreCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/** An unreadable cursor restarts from the first page rather than failing the search. */
export function decodeScoreCursor(value: string | undefined): ScoreCursor | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed = cursorShape.safeParse(JSON.parse(Buffer.from(value, "base64url").toString()));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
