import type { CountryRank, DeveloperRank, PointsBreakdown } from "@overpass/shared";

/** Storage port of the module; the service never sees SQL. */
export type RankingRepository = {
  /** Counts every source of points of one account from the contribution tables. */
  breakdown(userId: string): Promise<PointsBreakdown>;
  /** Upserts the cache entry, unless the account no longer exists. */
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
