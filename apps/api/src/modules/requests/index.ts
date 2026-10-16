import type { FastifyInstance, FastifyBaseLogger } from "fastify";
import type { Database } from "../../db/client.js";
import type { Mailer } from "../../mail/mailer.js";
import type { AccountResolver, ContactDirectory, HandleDirectory } from "../accounts/index.js";
import type { ServiceCatalogue } from "../routes/index.js";
import { createRequestsRepository } from "./repository.js";
import { registerRequestsRoutes } from "./routes.js";
import { createRequestsService } from "./service.js";

export type RequestsOptions = {
  db: Database;
  catalogue: ServiceCatalogue;
  handles: HandleDirectory;
  contacts: ContactDirectory;
  resolveAccount: AccountResolver;
  mailer: Mailer;
  log: FastifyBaseLogger;
  webOrigin: string;
  now: () => Date;
};

/** Mounts the requests module in its own encapsulated scope. */
export async function registerRequests(
  app: FastifyInstance,
  options: RequestsOptions,
): Promise<void> {
  const { db, mailer, log, resolveAccount, ...shared } = options;
  const service = createRequestsService({
    ...shared,
    repository: createRequestsRepository(db),
    reportError: (error) => {
      log.error({ err: error }, "proposal outcome could not be prepared");
    },
    notify: (message) => {
      mailer.send(message).catch((error: unknown) => {
        log.error({ err: error }, "proposal outcome mail could not be sent");
      });
    },
  });
  await app.register((scope) => {
    registerRequestsRoutes(scope, service, resolveAccount);
    return Promise.resolve();
  });
}
