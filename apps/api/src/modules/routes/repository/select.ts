import { and, eq, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { ChecksReader } from "../../checks/index.js";
import { routes, services } from "../tables.js";

/** The columns of a RouteRow, state counts included. */
export function rowSelection(checks: ChecksReader) {
  return {
    id: routes.id,
    translationGroup: routes.translationGroup,
    authorId: routes.authorId,
    serviceId: routes.serviceId,
    country: routes.country,
    stack: routes.stack,
    language: routes.language,
    title: routes.title,
    content: routes.content,
    version: routes.version,
    moderation: routes.moderation,
    createdAt: routes.createdAt,
    updatedAt: routes.updatedAt,
    service: { slug: services.slug, name: services.name, simulated: services.simulated },
    ...checks.stateColumns(routes.id),
  };
}

/** Live routes joined to their service, narrowed by extra conditions. */
export function liveRows(db: Database, checks: ChecksReader, ...conditions: (SQL | undefined)[]) {
  return db
    .select(rowSelection(checks))
    .from(routes)
    .innerJoin(services, eq(routes.serviceId, services.id))
    .where(and(isNull(routes.deletedAt), ...conditions));
}
