import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { AccountResolver, HandleDirectory } from "../accounts/index.js";
import type { ChecksReader, RouteDirectory } from "../checks/index.js";
import { createRoutesRepository } from "./repository.js";
import { registerRoutesRoutes } from "./routes.js";
import { createRoutesService } from "./service.js";

export type RoutesOptions = {
  db: Database;
  checks: ChecksReader;
  handles: HandleDirectory;
  resolveAccount: AccountResolver;
  now: () => Date;
};

/** What other modules may ask about routes, without mounting any route. */
export function routeDirectory(
  db: Database,
  checks: ChecksReader,
): RouteDirectory & {
  countByAuthor: (authorId: string) => Promise<number>;
} {
  const repository = createRoutesRepository(db, checks);
  return {
    facts: async (routeId) => {
      const route = await repository.findLive(routeId);
      return route === null ? null : { authorId: route.authorId };
    },
    titles: (ids) => repository.titles(ids),
    countByAuthor: (authorId) => repository.countByAuthor(authorId),
    confirmCoverage: (routeId, at) => repository.confirmCoverage(routeId, at),
  };
}

/** Mounts the routes module in its own encapsulated scope. */
export async function registerRoutes(app: FastifyInstance, options: RoutesOptions): Promise<void> {
  const service = createRoutesService({
    repository: createRoutesRepository(options.db, options.checks),
    checks: options.checks,
    handles: options.handles,
    now: options.now,
  });
  await app.register((scope) => {
    registerRoutesRoutes(scope, service, options.resolveAccount);
    return Promise.resolve();
  });
}
