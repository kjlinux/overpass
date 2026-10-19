import type { Stats } from "@overpass/shared";
import type { StatsRepository } from "./repository.js";

export type StatsDeps = { repository: StatsRepository; now: () => Date };

/** Business rules of the stats module: real counts, dated when they were taken. */
export function createStatsService({ repository, now }: StatsDeps) {
  return {
    read: async (): Promise<Stats> => ({
      ...(await repository.counts()),
      updatedAt: now().toISOString(),
    }),
  };
}

export type StatsService = ReturnType<typeof createStatsService>;
