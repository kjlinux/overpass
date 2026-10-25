/** Points turn into trust past one threshold: section 4, "Membre confirmé". */
export const trustRules = {
  confirmedMinPoints: 20,
  confirmedReportWeight: 2,
  confirmedLimitFactor: 3,
} as const;

export function isConfirmed(points: number): boolean {
  return points >= trustRules.confirmedMinPoints;
}

export function reportWeight(confirmed: boolean): number {
  return confirmed ? trustRules.confirmedReportWeight : 1;
}

export function writeQuota(base: number, confirmed: boolean): number {
  return confirmed ? base * trustRules.confirmedLimitFactor : base;
}
