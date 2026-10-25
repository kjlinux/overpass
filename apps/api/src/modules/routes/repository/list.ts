import { desc, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { ChecksReader } from "../../checks/index.js";
import type { ListedRow, ListFilters } from "../model.js";
import { routes, services } from "../tables.js";
import { rowSelection } from "./select.js";
import { listedRoute } from "./visibility.js";

const searchColumn = sql`"routes"."search"`;

/** A query matched in every configuration, since a reader searches across languages. */
function textQuery(q: string): SQL {
  return sql`(websearch_to_tsquery('french', ${q}) || websearch_to_tsquery('english', ${q}) || websearch_to_tsquery('simple', ${q}))`;
}

function filterConditions(checks: ChecksReader, filters: ListFilters): (SQL | undefined)[] {
  return [
    filters.service === undefined ? undefined : eq(services.slug, filters.service),
    filters.country === undefined ? undefined : eq(routes.country, filters.country),
    filters.stack === undefined ? undefined : eq(routes.stack, filters.stack),
    filters.language === undefined ? undefined : eq(routes.language, filters.language),
    filters.state === undefined ? undefined : checks.stateCondition(routes.id, filters.state),
    filters.potholes === undefined ? undefined : checks.openPotholesCondition(routes.id),
  ];
}

function afterCursor(filters: ListFilters, rank: SQL<number> | undefined): SQL | undefined {
  const after = filters.after;
  if (after === undefined) return undefined;
  if (after.mode === "rank" && rank !== undefined) {
    return sql`(${rank}, ${routes.id}) < (${after.key}::real, ${after.id}::uuid)`;
  }
  return sql`(${routes.updatedAt}, ${routes.id}) < (${after.key}::timestamptz, ${after.id}::uuid)`;
}

/** One page plus one row, so the caller knows whether another page exists. */
export async function listRoutes(
  db: Database,
  checks: ChecksReader,
  filters: ListFilters,
): Promise<ListedRow[]> {
  const query = filters.q === undefined ? undefined : textQuery(filters.q);
  const rank = query === undefined ? undefined : sql<number>`ts_rank(${searchColumn}, ${query})`;
  const conditions = [
    listedRoute(),
    ...filterConditions(checks, filters),
    query === undefined ? undefined : sql`${searchColumn} @@ ${query}`,
    afterCursor(filters, rank),
  ].filter((condition): condition is SQL => condition !== undefined);
  const order =
    rank === undefined
      ? [desc(routes.updatedAt), desc(routes.id)]
      : [sql`${rank} desc`, desc(routes.id)];
  return db
    .select({ ...rowSelection(checks), rank: (rank ?? sql<number>`0`).mapWith(Number) })
    .from(routes)
    .innerJoin(services, eq(routes.serviceId, services.id))
    .where(sql.join(conditions, sql` and `))
    .orderBy(...order)
    .limit(filters.limit + 1);
}
