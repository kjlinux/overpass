import { isConfirmed, levelFor, pointsFor, rankingSizeMax, trustRules } from "@overpass/shared";
import type { DeveloperRank, DeveloperRankingQuery } from "@overpass/shared";
import type { RankingRepository } from "./model.js";

export type RankingDeps = { repository: RankingRepository; now: () => Date };

/** Business rules of the ranking module: points are recomputed, never incremented. */
export function createRankingService({ repository, now }: RankingDeps) {
  const recomputeOne = async (userId: string): Promise<number> => {
    const breakdown = await repository.breakdown(userId);
    const points = pointsFor(breakdown);
    await repository.store(userId, breakdown, points, now());
    return points;
  };
  const pointsOf = async (userId: string): Promise<number> =>
    (await repository.cachedPoints(userId)) ?? recomputeOne(userId);
  return {
    recompute: async (userIds: readonly (string | null | undefined)[]): Promise<void> => {
      const unique = new Set(userIds.filter((id): id is string => typeof id === "string"));
      for (const userId of unique) await recomputeOne(userId);
    },
    pointsOf,
    isConfirmed: async (userId: string): Promise<boolean> => isConfirmed(await pointsOf(userId)),
    confirmedAmong: (userIds: readonly string[]): Promise<Set<string>> =>
      repository.reaching([...new Set(userIds)], trustRules.confirmedMinPoints),
    countries: () => repository.countries(rankingSizeMax),
    developers: async (query: DeveloperRankingQuery): Promise<DeveloperRank[]> => {
      const found = await repository.developers(query.country, rankingSizeMax);
      return found.map(({ checks, ...row }) => ({ ...row, level: levelFor(checks) }));
    },
  };
}

export type RankingService = ReturnType<typeof createRankingService>;
