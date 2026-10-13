import { freshnessStart, routeRules } from "@overpass/shared";
import type { RouteState } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import { checks, potholes } from "./tables.js";

export type StateColumns = {
  recentCheckers: SQL<number>;
  unresolvedPotholes: SQL<number>;
  lastCheckAt: SQL<Date | null>;
};

const recentCheckersSql = (routeId: AnyColumn, since: string) =>
  sql`(select count(distinct ${checks.userId}) from ${checks} where ${checks.routeId} = ${routeId} and ${checks.checkedAt} >= ${since}::timestamptz)`;

const unresolvedSql = (routeId: AnyColumn) =>
  sql`(select count(*) from ${potholes} where ${potholes.routeId} = ${routeId} and ${potholes.status} <> 'resolved')`;

/** Correlated counts the routes module selects next to each route; `now` comes from the app clock. */
export function stateColumns(routeId: AnyColumn, now: Date): StateColumns {
  const since = freshnessStart(now).toISOString();
  return {
    recentCheckers: recentCheckersSql(routeId, since).mapWith(Number),
    unresolvedPotholes: unresolvedSql(routeId).mapWith(Number),
    lastCheckAt:
      sql<Date | null>`(select max(${checks.checkedAt}) from ${checks} where ${checks.routeId} = ${routeId})`.mapWith(
        (value: string | Date | null) => (value === null ? null : new Date(value)),
      ),
  };
}

/** The same rule as routeState, in SQL, so the catalogue can filter on it. */
export function stateCondition(routeId: AnyColumn, now: Date, state: RouteState): SQL {
  const since = freshnessStart(now).toISOString();
  const unresolved = unresolvedSql(routeId);
  const recent = recentCheckersSql(routeId, since);
  const broken = sql`${unresolved} >= ${routeRules.brokenMinPotholes}`;
  const clear = sql`${recent} >= ${routeRules.clearMinCheckers}`;
  if (state === "broken") return broken;
  if (state === "clear") return sql`not (${broken}) and ${clear}`;
  return sql`not (${broken}) and not (${clear})`;
}
