import { routeRules } from "@overpass/shared";

const day = 86_400_000;
const week = 7 * day;
export const weekCount = Math.ceil(routeRules.freshnessDays / 7);

/** One flag per week of the freshness window, oldest first, set where a check landed. */
export function weeksWithChecks(checkedAt: string[], now: Date): boolean[] {
  const weeks = Array.from({ length: weekCount }, () => false);
  for (const iso of checkedAt) {
    const age = now.getTime() - new Date(iso).getTime();
    if (age < 0 || age > routeRules.freshnessDays * day) continue;
    weeks[weekCount - 1 - Math.min(weekCount - 1, Math.floor(age / week))] = true;
  }
  return weeks;
}
