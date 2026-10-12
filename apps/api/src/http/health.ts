import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";

/** Registers the liveness probe used by the proxy and the status page. */
export function registerHealth(app: FastifyInstance): void {
  app.get("/v1/health", () => ok({ status: "ok" as const }));
}
