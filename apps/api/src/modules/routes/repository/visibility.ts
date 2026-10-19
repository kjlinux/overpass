import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

/** The single visibility rule of itineraries: live and not hidden by the moderation team. */
export function listedRoute(alias: "routes" | "r" = "routes"): SQL {
  const table = sql.raw(`"${alias}"`);
  return sql`(${table}.deleted_at is null and ${table}.moderation = 'visible')`;
}

/** A country confirmed by an itinerary stops counting while that itinerary is hidden. */
export function countedCoverage(alias: "service_countries" | "sc" = "service_countries"): SQL {
  const table = sql.raw(`"${alias}"`);
  return sql`not exists (select 1 from routes hidden
    where hidden.id = ${table}.route_id and hidden.moderation = 'hidden')`;
}
