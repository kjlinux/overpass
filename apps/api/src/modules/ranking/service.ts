import { pointsFor, rankingSizeMax } from "@overpass/shared";
import type { DeveloperRankingQuery } from "@overpass/shared";
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
  return {
    recompute: async (userIds: readonly (string | null | undefined)[]): Promise<void> => {
      const unique = new Set(userIds.filter((id): id is string => typeof id === "string"));
      for (const userId of unique) await recomputeOne(userId);
    },
    pointsOf: async (userId: string): Promise<number> =>
      (await repository.cachedPoints(userId)) ?? recomputeOne(userId),
    countries: () => repository.countries(rankingSizeMax),
    developers: (query: DeveloperRankingQuery) =>
      repository.developers(query.country, rankingSizeMax),
  };
}

export type RankingService = ReturnType<typeof createRankingService>;
