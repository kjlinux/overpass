import type { FastifyInstance } from "fastify";
import type { Database } from "./db/client.js";
import { handleDirectory } from "./modules/accounts/index.js";
import type { AccountResolver, ContributionsSource } from "./modules/accounts/index.js";
import { checksReader, registerChecks } from "./modules/checks/index.js";
import type { ContributionListener } from "./modules/ranking/index.js";
import { registerRoutes, routeDirectory } from "./modules/routes/index.js";

/** Builds the read sides first, so accounts can count contributions before any route mounts. */
export function itineraries(db: Database, now: () => Date, onContribution: ContributionListener) {
  const handles = handleDirectory(db);
  const checks = checksReader(db, handles, now);
  const routes = routeDirectory(db, checks);
  const contributions: ContributionsSource = async (userId) => ({
    routes: await routes.countByAuthor(userId),
    ...(await checks.contributions(userId)),
  });
  const register = async (app: FastifyInstance, resolveAccount: AccountResolver) => {
    const shared = { db, handles, resolveAccount, onContribution, now };
    await registerRoutes(app, { ...shared, checks });
    await registerChecks(app, { ...shared, routes });
  };
  return { contributions, register };
}
