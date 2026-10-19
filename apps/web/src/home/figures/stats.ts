import { statsSchema } from "@overpass/shared";
import type { Stats } from "@overpass/shared";

/** Reads the data of GET /v1/stats against the shared contract; anything else is an error, never a number. */
export function parseStats(data: unknown): Stats | null {
  const parsed = statsSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Groups digits the way the reader's language does. */
export function formatCount(value: number, language: string): string {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(value);
}

/** The counter value at a progress between 0 and 1, eased out, landing exactly on the target. */
export function countAt(target: number, progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const eased = 1 - (1 - clamped) ** 3;
  return clamped === 1 ? target : Math.min(Math.round(target * eased), target);
}
