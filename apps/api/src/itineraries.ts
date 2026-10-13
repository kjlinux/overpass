import type { FastifyInstance } from "fastify";
import type { Database } from "./db/client.js";
import { handleDirectory } from "./modules/accounts/index.js";
import type { AccountResolver, ContributionsSource } from "./modules/accounts/index.js";
import { checksReader, registerChecks } from "./modules/checks/index.js";
import { registerRoutes, routeDirectory } from "./modules/routes/index.js";

/** Builds the read sides first, so accounts can count contributions before any route mounts. */
export function itineraries(db: Database, now: () => Date) {
  const handles = handleDirectory(db);
  const checks = checksReader(db, handles, now);
  const routes = routeDirectory(db, checks);
  const contributions: ContributionsSource = async (userId) => ({
    routes: await routes.countByAuthor(userId),
    ...(await checks.contributions(userId)),
  });
  const register = async (app: FastifyInstance, resolveAccount: AccountResolver) => {
    await registerRoutes(app, { db, checks, handles, resolveAccount, now });
    await registerChecks(app, { db, routes, handles, resolveAccount, now });
  };
  return { contributions, register };
}
