import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { Mailer } from "../../mail/mailer.js";
import { sessionCookies } from "./cookies.js";
import { createAccountsRepository } from "./repository.js";
import { registerAccountsRoutes } from "./routes.js";
import { createAccountsService } from "./service.js";
import type { ContributionsSource } from "./service.js";

export type { AuthMode } from "./guard.js";
export type { AccountsService, ContributionsSource } from "./service.js";

export type AccountsOptions = {
  db: Database;
  mailer: Mailer;
  secret: string;
  webOrigin: string;
  secureCookies: boolean;
  contributions?: ContributionsSource;
};

/** Mounts the accounts module in its own encapsulated scope. */
export async function registerAccounts(app: FastifyInstance, options: AccountsOptions) {
  const service = createAccountsService({
    repository: createAccountsRepository(options.db),
    mailer: options.mailer,
    secret: options.secret,
    webOrigin: options.webOrigin,
    ...(options.contributions === undefined ? {} : { contributions: options.contributions }),
    onBackgroundError: (error) => {
      app.log.error({ err: error }, "password reset mail could not be sent");
    },
  });
  await app.register((scope) => {
    registerAccountsRoutes(scope, service, sessionCookies(options.secureCookies));
    return Promise.resolve();
  });
}
