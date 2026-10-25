import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import { searchRepository } from "./repository.js";
import { registerSearchRoutes } from "./routes.js";
import { createSearchService } from "./service.js";

export type SearchOptions = { db: Database; now: () => Date };

/** Read-only search across articles, discussions and itineraries. */
export function registerSearch(app: FastifyInstance, { db, now }: SearchOptions): void {
  registerSearchRoutes(app, createSearchService(searchRepository(db), now));
}
