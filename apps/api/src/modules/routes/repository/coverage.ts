import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { CoverageRecord, RoutesRepository, ServiceRecord } from "../model.js";
import { serviceCountries, services } from "../tables.js";
import { countedCoverage } from "./visibility.js";

type ServicePart = Pick<RoutesRepository, "services" | "serviceBySlug" | "confirmCoverage">;
type ServiceRow = Omit<ServiceRecord, "coverage">;

const serviceColumns = {
  id: services.id,
  slug: services.slug,
  name: services.name,
  category: services.category,
  simulated: services.simulated,
};

/** Only confirmed countries ever leave the database. */
async function withCoverage(db: Database, rows: ServiceRow[]): Promise<ServiceRecord[]> {
  if (rows.length === 0) return [];
  const confirmed = await db
    .select()
    .from(serviceCountries)
    .where(
      and(
        eq(serviceCountries.confirmed, true),
        countedCoverage(),
        inArray(
          serviceCountries.serviceId,
          rows.map((row) => row.id),
        ),
      ),
    )
    .orderBy(serviceCountries.country);
  const toCoverage = (row: (typeof confirmed)[number]): CoverageRecord => ({
    country: row.country,
    basis: row.basis,
    source: row.source,
    consultedOn: row.consultedOn,
    routeId: row.routeId,
    confirmedAt: row.confirmedAt,
  });
  return rows.map((row) => ({
    ...row,
    coverage: confirmed.filter((entry) => entry.serviceId === row.id).map(toCoverage),
  }));
}

/** A clear road confirms its service in its country; a source confirmation is never replaced. */
async function confirmCoverage(db: Database, routeId: string, at: Date): Promise<void> {
  await db.execute(sql`
    insert into service_countries (service_id, country, confirmed, basis, route_id, confirmed_at)
    select service_id, country, true, 'community', id, ${at.toISOString()}::timestamptz
    from routes where id = ${routeId} and deleted_at is null
    on conflict (service_id, country) do update
    set confirmed = true, basis = 'community', source = null, consulted_on = null,
        route_id = excluded.route_id, confirmed_at = excluded.confirmed_at
    where service_countries.confirmed = false or not ${countedCoverage()}`);
}

export function serviceQueries(db: Database): ServicePart {
  return {
    services: async () =>
      withCoverage(db, await db.select(serviceColumns).from(services).orderBy(services.name)),
    serviceBySlug: async (slug) => {
      const rows = await db.select(serviceColumns).from(services).where(eq(services.slug, slug));
      return (await withCoverage(db, rows.slice(0, 1)))[0] ?? null;
    },
    confirmCoverage: (routeId, at) => confirmCoverage(db, routeId, at),
  };
}
