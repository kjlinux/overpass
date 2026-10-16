import type { CountryRank, DeveloperRank, PointsBreakdown } from "@overpass/shared";

/** Storage port of the module; the service never sees SQL. */
export type RankingRepository = {
  breakdown(userId: string): Promise<PointsBreakdown>;
  store(userId: string, breakdown: PointsBreakdown, points: number, at: Date): Promise<void>;
  cachedPoints(userId: string): Promise<number | null>;
  countries(limit: number): Promise<CountryRank[]>;
  developers(country: string | undefined, limit: number): Promise<DeveloperRank[]>;
};

/** Called by the other modules after any write that may change someone's points. */
export type ContributionListener = (
  userIds: readonly (string | null | undefined)[],
) => Promise<void>;

/** The cached points of an account, rebuilt when the entry is missing. */
export type PointsSource = (userId: string) => Promise<number>;
