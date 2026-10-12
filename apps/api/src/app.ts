import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import { registerErrorHandlers } from "./http/errors.js";
import { registerHealth } from "./http/health.js";

/** Builds the stateless API instance without starting it. */
export function buildApp(config: Pick<Config, "LOG_LEVEL">): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    genReqId: () => randomUUID(),
    requestIdHeader: "x-request-id",
  });
  app.addHook("onRequest", (request, reply, done) => {
    reply.raw.setHeader("x-request-id", request.id);
    done();
  });
  registerErrorHandlers(app);
  registerHealth(app);
  return app;
}
