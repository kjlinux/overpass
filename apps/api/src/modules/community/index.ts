import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { AccountResolver, HandleDirectory } from "../accounts/index.js";
import { CommunityRepository } from "./repository.js";
import { registerCommunityRoutes } from "./routes.js";
import { CommunityService } from "./service.js";

export type CommunityDeps = {
  db: Database;
  resolveAccount: AccountResolver;
  handles?: HandleDirectory;
};

export function registerCommunity(
  app: FastifyInstance,
  { db, resolveAccount, handles }: CommunityDeps,
): void {
  const repo = new CommunityRepository(db);
  const service = new CommunityService(repo, handles);
  registerCommunityRoutes({ app, service, resolve: resolveAccount });
}

export { CommunityRepository } from "./repository.js";
export { CommunityService } from "./service.js";
