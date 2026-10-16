import { and, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { RoutesRepository } from "../model.js";
import { routes, services } from "../tables.js";

type LinkPart = Pick<RoutesRepository, "fromThreads" | "serviceNames">;

/** Links between routes and the discussions: source threads and service names. */
export function linkQueries(db: Database): LinkPart {
  return {
    fromThreads: async (threadIds) => {
      if (threadIds.length === 0) return new Map();
      const rows = await db
        .select({ id: routes.id, threadId: routes.sourceThreadId })
        .from(routes)
        .where(
          and(inArray(routes.sourceThreadId, [...new Set(threadIds)]), isNull(routes.deletedAt)),
        );
      return new Map(
        rows.flatMap((row) => (row.threadId === null ? [] : [[row.threadId, row.id]])),
      );
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
