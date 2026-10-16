import { routeRules } from "@overpass/shared";
import type { RouteState } from "@overpass/shared";

const day = 86_400_000;

export type Freshness = "fresh" | "stale" | "never_checked" | "broken";

/** What the assistant should warn about before relying on a route. */
export function freshnessOf(
  route: { state: RouteState; lastCheckAt: string | null },
  now: Date,
): Freshness {
  if (route.state === "broken") return "broken";
  if (route.lastCheckAt === null) return "never_checked";
  const age = now.getTime() - new Date(route.lastCheckAt).getTime();
  return age > routeRules.freshnessDays * day ? "stale" : "fresh";
}
