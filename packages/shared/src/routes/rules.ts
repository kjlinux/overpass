const day = 86_400_000;

/** Thresholds of the business rules in section 4 of the specification. */
export const routeRules = {
  clearMinCheckers: 2,
  freshnessDays: 90,
  brokenMinPotholes: 2,
  checkCooldownDays: 30,
} as const;

export const routeStates = ["clear", "to_verify", "broken"] as const;
export type RouteState = (typeof routeStates)[number];

export type StateCounts = {
  /** Distinct accounts that checked the route within the freshness window. */
  recentCheckers: number;
  /** Potholes still open or confirmed. */
  unresolvedPotholes: number;
};

/** Computes the state of a route; it is never stored nor typed by anyone. */
export function routeState(counts: StateCounts): RouteState {
  if (counts.unresolvedPotholes >= routeRules.brokenMinPotholes) return "broken";
  if (counts.recentCheckers >= routeRules.clearMinCheckers) return "clear";
  return "to_verify";
}

export type CheckEligibility = "allowed" | "own_route" | "too_soon";

export type EligibilityFacts = { isAuthor: boolean; lastCheckAt: Date | null; now: Date };

/** The date from which an account may check the same route again. */
export function nextCheckAt(lastCheckAt: Date): Date {
  return new Date(lastCheckAt.getTime() + routeRules.checkCooldownDays * day);
}

/** Whether an account may check a route now. */
export function checkEligibility({
  isAuthor,
  lastCheckAt,
  now,
}: EligibilityFacts): CheckEligibility {
  if (isAuthor) return "own_route";
  if (lastCheckAt !== null && now < nextCheckAt(lastCheckAt)) return "too_soon";
  return "allowed";
}

/** Start of the window in which checks count towards a clear road. */
export function freshnessStart(now: Date): Date {
  return new Date(now.getTime() - routeRules.freshnessDays * day);
}
