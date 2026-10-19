import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { developerRankingQuery } from "./schemas.js";
import type { RankingService } from "./service.js";

const minute = 60 * 1000;

/** Per-IP budget: both reads are one aggregate over the points cache. */
const limits = { read: { max: 120, timeWindow: minute } };

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export function registerRankingRoutes(app: FastifyInstance, service: RankingService): void {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });
  const options = { config: { rateLimit: limits.read } };
  app.get("/v1/ranking/countries", options, async () => ok(await service.countries()));
  app.get("/v1/ranking/developers", options, async (request) =>
    ok(await service.developers(parseInput(developerRankingQuery, request.query))),
  );
}
