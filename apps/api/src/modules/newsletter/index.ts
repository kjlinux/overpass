import type { Language } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { Mailer } from "../../mail/mailer.js";
import type { AccountResolver } from "../accounts/index.js";
import { createNewsletterRepository } from "./repository.js";
import { registerNewsletterRoutes } from "./routes.js";
import { createNewsletterService } from "./service.js";
import type { NewsletterLog } from "./service.js";
import { sendingService } from "./service/sending.js";

export type NewsletterOptions = {
  db: Database;
  mailer: Mailer;
  secret: string;
  webOrigin: string;
  now: () => Date;
  log: NewsletterLog;
};

const silent: NewsletterLog = { error: () => undefined };

function depsOf(options: NewsletterOptions) {
  const { db, ...rest } = options;
  return { ...rest, repository: createNewsletterRepository(db) };
}

/** Built before accounts, so ticking the sign-up box can start the double opt-in. */
export function newsletterModule(options: NewsletterOptions) {
  const service = createNewsletterService(depsOf(options));
  const consent = async (contact: { email: string; language: Language }): Promise<void> => {
    await service.subscribe(contact);
  };
  const register = async (app: FastifyInstance, resolve: AccountResolver): Promise<void> => {
    await app.register(async (scope) => {
      await registerNewsletterRoutes(scope, service, resolve);
    });
  };
  return { consent, register };
}

/** The queue consumer run by the worker process, one batch per call. */
export function createNewsletterWorker(
  options: Omit<NewsletterOptions, "log"> & { log?: NewsletterLog; batchSize?: number },
) {
  const { batchSize, log, ...rest } = options;
  const deps = depsOf({ ...rest, log: log ?? silent });
  return sendingService(deps, batchSize === undefined ? {} : { batchSize });
}
