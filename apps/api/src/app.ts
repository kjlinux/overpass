import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
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
import { adminModule } from "./modules/admin/index.js";
import type { ModerationLog } from "./modules/admin/index.js";
import { registerBlog } from "./modules/blog/index.js";
import type { ContributionListener } from "./modules/ranking/index.js";
import { newsletterModule } from "./modules/newsletter/index.js";
import { rankingModule } from "./modules/ranking/index.js";
import { registerRequests } from "./modules/requests/index.js";
import { serviceCatalogue } from "./modules/routes/index.js";
import { registerShare } from "./modules/share/index.js";
import { registerStats } from "./modules/stats/index.js";
import { registerSimulator } from "./simulator.js";
import type { SandboxDeps } from "./simulator.js";

export type AppConfig = Pick<
  Config,
  "NODE_ENV" | "LOG_LEVEL" | "TRUST_PROXY" | "WEB_ORIGIN" | "SESSION_SECRET"
> &
  Partial<Config>;

export type { SandboxDeps } from "./simulator.js";

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
    moderationLog: ModerationLog;
    newsletter: ReturnType<typeof newsletterModule>;
  },
): Promise<void> {
  const { db, sender, onContribution, moderationLog, newsletter, ...rest } = deps;
  await registerRequests(app, {
    ...rest,
    db,
    catalogue: serviceCatalogue(db),
    handles: handleDirectory(db),
    contacts: contactDirectory(db),
    mailer: sender,
    log: app.log,
    moderationLog,
  });
  await registerBlog(app, { ...rest, db, onContribution, log: moderationLog });
  await newsletter.register(app, rest.resolveAccount);
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
  const admin = adminModule({ db, onContribution: ranking.listener, now: clock });
  const catalogue = itineraries(db, clock, { onContribution: ranking.listener, log: admin.log });
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
  await admin.register(app, resolveAccount);
  await registerStats(app, { db, now: clock });
  await registerShare(app, { db, config, now: clock });
  const community = { db, sender, resolveAccount, webOrigin: config.WEB_ORIGIN, now: clock };
  const ports = { onContribution: ranking.listener, moderationLog: admin.log };
  await registerCommunity(app, { ...community, ...ports, newsletter });
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
