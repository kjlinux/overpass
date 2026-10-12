import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import type { Database } from "./db/client.js";
import { registerErrorHandlers } from "./http/errors.js";
import { registerHealth } from "./http/health.js";
import { registerOriginCheck } from "./http/origin.js";
import { createMailer } from "./mail/mailer.js";
import type { Mailer } from "./mail/mailer.js";
import { registerAccounts } from "./modules/accounts/index.js";

export type AppConfig = Pick<
  Config,
  "NODE_ENV" | "LOG_LEVEL" | "TRUST_PROXY" | "WEB_ORIGIN" | "SESSION_SECRET"
> &
  Partial<Config>;

export type AppDeps = { config: AppConfig; db?: Database; mailer?: Mailer };

const redactedHeaders = ["req.headers.cookie", "req.headers.authorization"];

/** Builds the stateless API instance without starting it; modules need a database. */
export async function buildApp({ config, db, mailer }: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL, redact: redactedHeaders },
    genReqId: () => randomUUID(),
    requestIdHeader: "x-request-id",
    trustProxy: config.TRUST_PROXY,
  });
  app.addHook("onRequest", (request, reply, done) => {
    reply.raw.setHeader("x-request-id", request.id);
    done();
  });
  registerErrorHandlers(app);
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  registerOriginCheck(app, config.WEB_ORIGIN);
  registerHealth(app);
  if (db !== undefined) {
    await registerAccounts(app, {
      db,
      mailer: mailer ?? createMailer(config, app.log),
      secret: config.SESSION_SECRET,
      webOrigin: config.WEB_ORIGIN,
      secureCookies: config.NODE_ENV === "production",
    });
  }
  return app;
}
