import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { RoutesRepository } from "../model.js";
import { routes, services } from "../tables.js";
import { listedRoute } from "./visibility.js";

type LinkPart = Pick<RoutesRepository, "fromThreads" | "hasRouteFromThread" | "serviceNames">;

/** Links between routes and the discussions: source threads and service names. */
export function linkQueries(db: Database): LinkPart {
  return {
    fromThreads: async (threadIds) => {
      if (threadIds.length === 0) return new Map();
      const rows = await db
        .select({ id: routes.id, threadId: routes.sourceThreadId })
        .from(routes)
        .where(and(inArray(routes.sourceThreadId, [...new Set(threadIds)]), listedRoute()));
      return new Map(
        rows.flatMap((row) => (row.threadId === null ? [] : [[row.threadId, row.id]])),
      );
    },
    hasRouteFromThread: async (threadId) => {
      const where = and(eq(routes.sourceThreadId, threadId), isNull(routes.deletedAt));
      return (await db.select({ id: routes.id }).from(routes).where(where).limit(1)).length > 0;
    },
    serviceNames: async (serviceIds) => {
      if (serviceIds.length === 0) return new Map();
      const rows = await db
        .select({ id: services.id, slug: services.slug, name: services.name })
        .from(services)
        .where(inArray(services.id, [...new Set(serviceIds)]));
      return new Map(rows.map((row) => [row.id, { slug: row.slug, name: row.name }]));
    },
  };
}
