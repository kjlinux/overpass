import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { ContributionListener, PointsSource } from "./model.js";
import { createRankingRepository } from "./repository.js";
import { registerRankingRoutes } from "./routes.js";
import { createRankingService } from "./service.js";

export type { ContributionListener, PointsSource } from "./model.js";

/** The listener and the points source are built first, so the other modules can use them. */
export function rankingModule(db: Database, now: () => Date) {
  const service = createRankingService({ repository: createRankingRepository(db), now });
  const listener: ContributionListener = (userIds) => service.recompute(userIds);
  const points: PointsSource = (userId) => service.pointsOf(userId);
  const register = async (app: FastifyInstance): Promise<void> => {
    await app.register((scope) => {
      registerRankingRoutes(scope, service);
      return Promise.resolve();
    });
  };
  return { listener, points, register };
}
