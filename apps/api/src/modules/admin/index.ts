import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { AccountResolver } from "../accounts/index.js";
import type { ContributionListener } from "../ranking/index.js";
import type { ModerationLog } from "./model.js";
import { createAdminRepository } from "./repository.js";
import { registerAdminRoutes } from "./routes.js";
import { createAdminService } from "./service.js";

export type { LogEntryInput, ModerationLog } from "./model.js";

export type AdminOptions = { db: Database; onContribution: ContributionListener; now: () => Date };

/** The log port is built first, so the other modules can record their decisions through it. */
export function adminModule({ db, onContribution, now }: AdminOptions) {
  const repository = createAdminRepository(db);
  const service = createAdminService({ repository, onContribution, now });
  const log: ModerationLog = (entry, tx) => createAdminRepository(tx).insertLog(entry);
  const register = async (app: FastifyInstance, resolveAccount: AccountResolver): Promise<void> => {
    await app.register((scope) => {
      registerAdminRoutes(scope, service, resolveAccount);
      return Promise.resolve();
    });
  };
  return { log, register };
}
