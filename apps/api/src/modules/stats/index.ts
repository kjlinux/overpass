import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import { createStatsRepository } from "./repository.js";
import { registerStatsRoutes } from "./routes.js";
import { createStatsService } from "./service.js";

/** Mounts the public figures in their own encapsulated scope. */
export async function registerStats(
  app: FastifyInstance,
  options: { db: Database; now: () => Date },
): Promise<void> {
  const service = createStatsService({
    repository: createStatsRepository(options.db),
    now: options.now,
  });
  await app.register((scope) => {
    registerStatsRoutes(scope, service);
    return Promise.resolve();
  });
}
