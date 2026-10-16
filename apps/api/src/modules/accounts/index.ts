import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { Mailer } from "../../mail/mailer.js";
import { sessionCookies } from "./cookies.js";
import { accountResolver } from "./directory.js";
import type { AccountResolver } from "./directory.js";
import { createAccountsRepository } from "./repository.js";
import { registerAccountsRoutes } from "./routes.js";
import { createAccountsService } from "./service.js";
import type { ContributionsSource, PointsSource } from "./service.js";

export type { AuthMode } from "./guard.js";
export type { AccountsService, ContributionsSource, PointsSource } from "./service.js";
export type { Account, AccountResolver, HandleDirectory } from "./directory.js";
export { handleDirectory, requireAccount } from "./directory.js";

export type AccountsOptions = {
  db: Database;
  mailer: Mailer;
  secret: string;
  webOrigin: string;
  secureCookies: boolean;
  contributions?: ContributionsSource;
  points?: PointsSource;
};

/** Mounts the accounts module in its own encapsulated scope; other modules get the resolver. */
export async function registerAccounts(
  app: FastifyInstance,
  options: AccountsOptions,
): Promise<{ resolveAccount: AccountResolver }> {
  const service = createAccountsService({
    repository: createAccountsRepository(options.db),
    mailer: options.mailer,
    secret: options.secret,
    webOrigin: options.webOrigin,
    ...(options.contributions === undefined ? {} : { contributions: options.contributions }),
    ...(options.points === undefined ? {} : { points: options.points }),
    onBackgroundError: (error) => {
      app.log.error({ err: error }, "password reset mail could not be sent");
    },
  });
  const cookies = sessionCookies(options.secureCookies);
  await app.register((scope) => {
    registerAccountsRoutes(scope, service, cookies);
    return Promise.resolve();
  });
  return { resolveAccount: accountResolver(service, cookies) };
}
