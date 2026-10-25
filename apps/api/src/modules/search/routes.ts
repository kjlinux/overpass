import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { searchQuery } from "./schemas.js";
import type { SearchService } from "./service.js";

const minute = 60_000;
/** Typing fires one search per pause, so a reader stays well under this per-IP budget. */
const limits = { search: { max: 120, timeWindow: minute } };

export function registerSearchRoutes(app: FastifyInstance, service: SearchService): void {
  app.get("/v1/search", { config: { rateLimit: limits.search } }, async (request) =>
    ok(await service.search(parseInput(searchQuery, request.query))),
  );
}
