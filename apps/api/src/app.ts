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
import { requestSerializer } from "./http/log-request.js";
import { registerOriginCheck } from "./http/origin.js";
import { registerSecurityHeaders } from "./http/security-headers.js";
import { counterStoreFor, postgresCounters } from "./limits/index.js";
import { createMailer } from "./mail/mailer.js";
import type { Mailer } from "./mail/mailer.js";
import { itineraries } from "./itineraries.js";
import { contactDirectory, handleDirectory, registerAccounts } from "./modules/accounts/index.js";
import type { AccountResolver } from "./modules/accounts/index.js";
import { registerBlog } from "./modules/blog/index.js";
import type { ContributionListener } from "./modules/ranking/index.js";
import { newsletterModule } from "./modules/newsletter/index.js";
import { rankingModule } from "./modules/ranking/index.js";
import { registerRequests } from "./modules/requests/index.js";
import { serviceCatalogue } from "./modules/routes/index.js";
import { registerSandbox } from "./modules/sandbox/index.js";
import { memoryBus, postgresBus } from "./modules/sandbox/index.js";
import type { HostResolver, RelayBus } from "./modules/sandbox/index.js";

export type AppConfig = Pick<
  Config,
  "NODE_ENV" | "LOG_LEVEL" | "TRUST_PROXY" | "WEB_ORIGIN" | "SESSION_SECRET"
> &
  Partial<Config>;

/** Tests swap the simulated providers and the DNS resolver; production uses the real ones. */
export type SandboxDeps = {
  providers?: readonly ProviderAdapter[];
  resolveHost?: HostResolver;
  bus?: RelayBus;
  demoProvider?: string;
};

/** Instances share relay announcements through PostgreSQL; without a URL, one process is enough. */
function relayBus(
  app: FastifyInstance,
  config: AppConfig,
  injected: RelayBus | undefined,
): RelayBus {
  if (injected !== undefined) return injected;
  const bus =
    config.DATABASE_URL === undefined ? memoryBus() : postgresBus(config.DATABASE_URL, app.log);
  app.addHook("onClose", () => bus.close());
  return bus;
}

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
  'req.headers["paydunya-master-key"]',
  'req.headers["paydunya-private-key"]',
  'req.headers["paydunya-token"]',
];

/** Service proposals and simulator requests, with outcome mails sent in the background. */
async function registerCommunity(
  app: FastifyInstance,
  deps: {
    db: Database;
    sender: Mailer;
    resolveAccount: AccountResolver;
    webOrigin: string;
    now: () => Date;
    onContribution: ContributionListener;
    newsletter: ReturnType<typeof newsletterModule>;
  },
): Promise<void> {
  const { db, sender, onContribution, newsletter, ...rest } = deps;
  await registerRequests(app, {
    ...rest,
    db,
    catalogue: serviceCatalogue(db),
    handles: handleDirectory(db),
    contacts: contactDirectory(db),
    mailer: sender,
    log: app.log,
  });
  await registerBlog(app, { ...rest, db, onContribution });
  await newsletter.register(app, rest.resolveAccount);
}

/** The sandbox shares the rate limit counters and announces relays across instances. */
async function registerSimulator(
  app: FastifyInstance,
  deps: Pick<AppDeps, "config"> & {
    sandbox: SandboxDeps | undefined;
    db: Database;
    counters: ReturnType<typeof postgresCounters>;
    resolveAccount: AccountResolver;
    now: () => Date;
  },
): Promise<void> {
  const { config, db, counters, sandbox, resolveAccount, now } = deps;
  await registerSandbox(app, {
    db,
    counters,
    providers: sandbox?.providers ?? providers,
    resolveAccount,
    serverSecret: config.SESSION_SECRET,
    webOrigin: config.WEB_ORIGIN,
    now,
    bus: relayBus(app, config, sandbox?.bus),
    ...(sandbox?.demoProvider === undefined ? {} : { demoProvider: sandbox.demoProvider }),
    ...(sandbox?.resolveHost === undefined ? {} : { resolveHost: sandbox.resolveHost }),
  });
}

/** Mounts every data module; they share one clock and one set of rate limit counters. */
async function registerModules(
  app: FastifyInstance,
  { config, db, mailer, now, sandbox }: AppDeps & { db: Database },
): Promise<void> {
  const counters = postgresCounters(db);
  const clock = now ?? (() => new Date());
  await app.register(rateLimit, { global: false, store: counterStoreFor(counters) });
  const ranking = rankingModule(db, clock, app.log);
  const catalogue = itineraries(db, clock, ranking.listener);
  const sender = mailer ?? createMailer(config, app.log);
  const newsletter = newsletterModule({
    db,
    mailer: sender,
    secret: config.SESSION_SECRET,
    webOrigin: config.WEB_ORIGIN,
    now: clock,
    log: app.log,
  });
  const { resolveAccount } = await registerAccounts(app, {
    db,
    mailer: sender,
    secret: config.SESSION_SECRET,
    webOrigin: config.WEB_ORIGIN,
    secureCookies: config.NODE_ENV === "production",
    contributions: catalogue.contributions,
    points: ranking.points,
    deletion: ranking.deletion,
    newsletterConsent: newsletter.consent,
  });
  await catalogue.register(app, resolveAccount);
  await ranking.register(app);
  const community = { db, sender, resolveAccount, webOrigin: config.WEB_ORIGIN, now: clock };
  await registerCommunity(app, { ...community, onContribution: ranking.listener, newsletter });
  await registerSimulator(app, { config, db, counters, sandbox, resolveAccount, now: clock });
}

/** Builds the stateless API instance without starting it; modules need a database. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, db } = deps;
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: redactedHeaders,
      serializers: { req: requestSerializer },
    },
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
