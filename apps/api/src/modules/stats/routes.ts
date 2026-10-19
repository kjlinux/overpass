import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import type { StatsService } from "./service.js";

const minute = 60 * 1000;

/** Per-IP budget; shared caches absorb most reads thanks to the one-minute public lifetime. */
const limits = { read: { max: 120, timeWindow: minute } };

/** HTTP surface of the module; handlers only delegate and shape the envelope. */
export function registerStatsRoutes(app: FastifyInstance, service: StatsService): void {
  app.get("/v1/stats", { config: { rateLimit: limits.read } }, async (_request, reply) => {
    reply.header("cache-control", "public, max-age=60");
    return ok(await service.read());
  });
}
