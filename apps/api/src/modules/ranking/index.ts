import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { DeletionEffects } from "../accounts/index.js";
import type { ContributionListener, PointsSource, TrustSource } from "./model.js";
import { createRankingRepository } from "./repository.js";
import { registerRankingRoutes } from "./routes.js";
import { createRankingService } from "./service.js";

export type { ContributionListener, PointsSource, TrustSource } from "./model.js";

type Logger = Pick<FastifyBaseLogger, "error">;

/** The listener and the points source are built first, so the other modules can use them. */
export function rankingModule(db: Database, now: () => Date, log: Logger) {
  const repository = createRankingRepository(db);
  const service = createRankingService({ repository, now });
  // The contribution is already saved: a failed recompute is logged, and the next event fixes it.
  const listener: ContributionListener = async (userIds) => {
    try {
      await service.recompute(userIds);
    } catch (error) {
      log.error({ err: error }, "points could not be recomputed");
    }
  };
  const points: PointsSource = (userId) => service.pointsOf(userId);
  const trust: TrustSource = {
    isConfirmed: (userId) => service.isConfirmed(userId),
    confirmedAmong: (userIds) => service.confirmedAmong(userIds),
  };
  const deletion: DeletionEffects = {
    affected: (userId) => repository.voteRecipients(userId),
    done: (userIds) => listener(userIds),
  };
  const register = async (app: FastifyInstance): Promise<void> => {
    await app.register((scope) => {
      registerRankingRoutes(scope, service);
      return Promise.resolve();
    });
  };
  return { listener, points, trust, deletion, register };
}
