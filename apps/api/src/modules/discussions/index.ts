import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { AccountResolver, HandleDirectory } from "../accounts/index.js";
import type { ModerationLog } from "../admin/index.js";
import type { ContributionListener } from "../ranking/index.js";
import type { RouteLookup } from "./model.js";
import { createDiscussionsRepository } from "./repository.js";
import { registerDiscussionsRoutes } from "./routes.js";
import { createDiscussionsService } from "./service.js";

export type { RouteFacts, RouteLookup } from "./model.js";

/** What other modules may ask about a thread, without mounting any route. */
export type ThreadDirectory = {
  facts(threadId: string): Promise<{ authorId: string | null; resolved: boolean } | null>;
};

export function threadDirectory(db: Database): ThreadDirectory {
  const repository = createDiscussionsRepository(db);
  return {
    facts: async (threadId) => {
      const thread = await repository.findThread(threadId);
      if (thread === null || thread.status === "removed") return null;
      return { authorId: thread.authorId, resolved: thread.acceptedReplyId !== null };
    },
  };
}

export type DiscussionsOptions = {
  db: Database;
  routes: RouteLookup;
  handles: HandleDirectory;
  resolveAccount: AccountResolver;
  onContribution: ContributionListener;
  log: ModerationLog;
  now: () => Date;
};

/** Mounts the discussions module in its own encapsulated scope. */
export async function registerDiscussions(
  app: FastifyInstance,
  options: DiscussionsOptions,
): Promise<void> {
  const service = createDiscussionsService({
    repository: createDiscussionsRepository(options.db),
    routes: options.routes,
    handles: options.handles,
    onContribution: options.onContribution,
    log: options.log,
    now: options.now,
  });
  await app.register((scope) => {
    registerDiscussionsRoutes(scope, service, options.resolveAccount);
    return Promise.resolve();
  });
}
