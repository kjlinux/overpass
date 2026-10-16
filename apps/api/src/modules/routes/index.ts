import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { AccountResolver, HandleDirectory } from "../accounts/index.js";
import type { ChecksReader, RouteDirectory } from "../checks/index.js";
import type { RouteLookup, ThreadDirectory } from "../discussions/index.js";
import type { ContributionListener } from "../ranking/index.js";
import { createRoutesRepository } from "./repository.js";
import { registerRoutesRoutes } from "./routes.js";
import { createRoutesService } from "./service.js";

export type RoutesOptions = {
  db: Database;
  checks: ChecksReader;
  handles: HandleDirectory;
  resolveAccount: AccountResolver;
  threads: ThreadDirectory;
  onContribution: ContributionListener;
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

/** What the discussions module may ask about routes and services. */
export function routeLookup(db: Database, checks: ChecksReader): RouteLookup {
  const repository = createRoutesRepository(db, checks);
  return {
    facts: async (routeId) => {
      const route = await repository.findLive(routeId);
      if (route === null) return null;
      const service = (await repository.serviceNames([route.serviceId])).get(route.serviceId);
      if (service === undefined) return null;
      const { id, title, country } = route;
      return { id, title, country, service: { id: route.serviceId, ...service } };
    },
    titles: (ids) => repository.titles(ids),
    services: (ids) => repository.serviceNames(ids),
    fromThreads: (ids) => repository.fromThreads(ids),
  };
}

/** Mounts the routes module in its own encapsulated scope. */
export async function registerRoutes(app: FastifyInstance, options: RoutesOptions): Promise<void> {
  const service = createRoutesService({
    repository: createRoutesRepository(options.db, options.checks),
    checks: options.checks,
    handles: options.handles,
    threads: options.threads,
    onContribution: options.onContribution,
    now: options.now,
  });
  await app.register((scope) => {
    registerRoutesRoutes(scope, service, options.resolveAccount);
    return Promise.resolve();
  });
}
