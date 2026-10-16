/** Weights of section 4 of the specification; points are always computed, never typed. */
export const pointRules = {
  routes: 10,
  checks: 2,
  potholes: 5,
  accepted: 5,
  useful: 1,
  articles: 10,
} as const;

export type PointSource = keyof typeof pointRules;
export type PointsBreakdown = Record<PointSource, number>;

export const pointSources = Object.keys(pointRules) as PointSource[];

export function pointsFor(breakdown: PointsBreakdown): number {
  return pointSources.reduce((total, source) => total + breakdown[source] * pointRules[source], 0);
}
