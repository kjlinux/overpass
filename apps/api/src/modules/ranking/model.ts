import type { CountryRank, DeveloperRank, PointsBreakdown } from "@overpass/shared";

/** Storage port of the module; the service never sees SQL. */
/** The level is computed from the check count, so the row carries the count, not the level. */
export type DeveloperRow = Omit<DeveloperRank, "level"> & { checks: number };

export type RankingRepository = {
  breakdown(userId: string): Promise<PointsBreakdown>;
  store(userId: string, breakdown: PointsBreakdown, points: number, at: Date): Promise<void>;
  cachedPoints(userId: string): Promise<number | null>;
  reaching(userIds: string[], points: number): Promise<Set<string>>;
  /** Authors of the replies an account marked useful. */
  voteRecipients(userId: string): Promise<string[]>;
  countries(limit: number): Promise<CountryRank[]>;
  developers(country: string | undefined, limit: number): Promise<DeveloperRow[]>;
};

/** Called by the other modules after any write that may change someone's points. */
export type ContributionListener = (
  userIds: readonly (string | null | undefined)[],
) => Promise<void>;

/** The cached points of an account, rebuilt when the entry is missing. */
export type PointsSource = (userId: string) => Promise<number>;

/** Whether accounts are confirmed members, for the modules that grant them more. */
export type TrustSource = {
  isConfirmed(userId: string): Promise<boolean>;
  confirmedAmong(userIds: readonly string[]): Promise<Set<string>>;
};
