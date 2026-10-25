import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { RequestTrust } from "../../limits/index.js";
import type { AccountResolver, HandleDirectory } from "../accounts/index.js";
import type { ContributionListener } from "../ranking/index.js";
import type { RouteDirectory } from "./model.js";
import { createChecksReader } from "./reader.js";
import { createChecksRepository } from "./repository.js";
import { registerChecksRoutes } from "./routes.js";
import { createChecksService } from "./service.js";

export { seedChecks } from "./seed.js";
export type { CheckSeed } from "./seed.js";
export type { RouteDirectory } from "./model.js";
export type { ChecksReader, RouteCommunity } from "./reader.js";

export type ChecksOptions = {
  db: Database;
  routes: RouteDirectory;
  handles: HandleDirectory;
  resolveAccount: AccountResolver;
  confirmed: RequestTrust;
  onContribution: ContributionListener;
  now: () => Date;
};

/** The read side other modules use, built without mounting any route. */
export function checksReader(db: Database, handles: HandleDirectory, now: () => Date) {
  return createChecksReader({ repository: createChecksRepository(db), handles, now });
}

/** Mounts the checks module in its own encapsulated scope. */
export async function registerChecks(app: FastifyInstance, options: ChecksOptions): Promise<void> {
  const service = createChecksService({
    repository: createChecksRepository(options.db),
    routes: options.routes,
    handles: options.handles,
    onContribution: options.onContribution,
    now: options.now,
  });
  await app.register((scope) => {
    registerChecksRoutes(scope, service, options.resolveAccount, options.confirmed);
    return Promise.resolve();
  });
}
