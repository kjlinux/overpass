/** Levels of section 8 of the specification, from the weakest to the strongest. */
export const badgeLevels = ["hugin", "ragnar", "thor", "kratos", "odin"] as const;
export type BadgeLevel = (typeof badgeLevels)[number];

/** Minimum count for each level, in the order of badgeLevels; the one place the thresholds live. */
export const debuggerThresholds = [1, 10, 50, 150, 500] as const;

export type BadgeKey = "debugger" | "first.push";
export type MemberBadge = { badge: BadgeKey; level: BadgeLevel | null };

/** The highest level whose threshold the count reaches, or null below the first one. */
export function levelFor(
  count: number,
  thresholds: readonly number[] = debuggerThresholds,
): BadgeLevel | null {
  let reached: BadgeLevel | null = null;
  badgeLevels.forEach((level, index) => {
    const threshold = thresholds[index];
    if (threshold !== undefined && count >= threshold) reached = level;
  });
  return reached;
}

/** Badges are computed at each read, never stored: they follow the contributions. */
export function badgesFor(facts: { checks: number; routes: number }): MemberBadge[] {
  const badges: MemberBadge[] = [];
  if (facts.routes > 0) badges.push({ badge: "first.push", level: null });
  const level = levelFor(facts.checks);
  if (level !== null) badges.push({ badge: "debugger", level });
  return badges;
}

export function bestLevel(badges: readonly MemberBadge[]): BadgeLevel | null {
  const rank = (level: BadgeLevel | null) => (level === null ? -1 : badgeLevels.indexOf(level));
  return badges.reduce<BadgeLevel | null>(
    (best, badge) => (rank(badge.level) > rank(best) ? badge.level : best),
    null,
  );
}
