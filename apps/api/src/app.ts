import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { providers } from "@overpass/providers";
import type { ProviderAdapter } from "@overpass/simulator";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import type { Database } from "./db/client.js";
import { registerErrorHandlers } from "./http/errors.js";
import { registerHealth } from "./http/health.js";
import { registerOriginCheck } from "./http/origin.js";
import { registerSecurityHeaders } from "./http/security-headers.js";
import { counterStoreFor, postgresCounters } from "./limits/index.js";
import { createMailer } from "./mail/mailer.js";
import type { Mailer } from "./mail/mailer.js";
import { itineraries } from "./itineraries.js";
import { registerAccounts } from "./modules/accounts/index.js";
import { registerSandbox } from "./modules/sandbox/index.js";
import type { HostResolver } from "./modules/sandbox/index.js";

export type AppConfig = Pick<
  Config,
  "NODE_ENV" | "LOG_LEVEL" | "TRUST_PROXY" | "WEB_ORIGIN" | "SESSION_SECRET"
> &
  Partial<Config>;

/** Tests swap the simulated providers and the DNS resolver; production uses the real ones. */
export type SandboxDeps = { providers?: readonly ProviderAdapter[]; resolveHost?: HostResolver };

export type AppDeps = {
  config: AppConfig;
  db?: Database;
  mailer?: Mailer;
  now?: () => Date;
  sandbox?: SandboxDeps;
};

/** Trusts exactly the given number of proxies, so a forged X-Forwarded-For is ignored. */
function trustedHops(count: number) {
  return count === 0 ? false : (_address: string, hop: number) => hop < count;
}

const redactedHeaders = [
  "req.headers.cookie",
  "req.headers.authorization",
  'req.headers["x-api-key"]',
];

/** Mounts every data module; they share one clock and one set of rate limit counters. */
async function registerModules(
  app: FastifyInstance,
  { config, db, mailer, now, sandbox }: AppDeps & { db: Database },
): Promise<void> {
  const counters = postgresCounters(db);
  const clock = now ?? (() => new Date());
  await app.register(rateLimit, { global: false, store: counterStoreFor(counters) });
  const catalogue = itineraries(db, clock);
  const { resolveAccount } = await registerAccounts(app, {
    db,
    mailer: mailer ?? createMailer(config, app.log),
    secret: config.SESSION_SECRET,
    webOrigin: config.WEB_ORIGIN,
    secureCookies: config.NODE_ENV === "production",
    contributions: catalogue.contributions,
  });
  await catalogue.register(app, resolveAccount);
  await registerSandbox(app, {
    db,
    counters,
    providers: sandbox?.providers ?? providers,
    resolveAccount,
    serverSecret: config.SESSION_SECRET,
    webOrigin: config.WEB_ORIGIN,
    now: clock,
    ...(sandbox?.resolveHost === undefined ? {} : { resolveHost: sandbox.resolveHost }),
  });
}

/** Builds the stateless API instance without starting it; modules need a database. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, db } = deps;
  const app = Fastify({
    logger: { level: config.LOG_LEVEL, redact: redactedHeaders },
    genReqId: () => randomUUID(),
    requestIdHeader: "x-request-id",
    trustProxy: trustedHops(config.TRUST_PROXY),
  });
  app.addHook("onRequest", (request, reply, done) => {
    reply.raw.setHeader("x-request-id", request.id);
    done();
  });
  registerErrorHandlers(app);
  registerSecurityHeaders(app);
  await app.register(cookie);
  registerOriginCheck(app, config.WEB_ORIGIN);
  registerHealth(app);
  if (db !== undefined) await registerModules(app, { ...deps, db });
  return app;
}
