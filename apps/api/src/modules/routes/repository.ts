import { eq, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import type { ChecksReader } from "../checks/index.js";
import type { RoutesRepository } from "./model.js";
import { listRoutes } from "./repository/list.js";
import { readQueries } from "./repository/read.js";
import { insertRoute, softDelete, updateRoute } from "./repository/write.js";
import { serviceCountries, services } from "./tables.js";

/** Only countries a person has confirmed against a source leave the database. */
const confirmedCountries = sql<
  string[]
>`coalesce((select array_agg(${serviceCountries.country}::text order by ${serviceCountries.country}) from ${serviceCountries} where ${serviceCountries.serviceId} = ${services.id} and ${serviceCountries.confirmed}), '{}'::text[])`;

const serviceColumns = {
  id: services.id,
  slug: services.slug,
  name: services.name,
  category: services.category,
  simulated: services.simulated,
  countries: confirmedCountries,
};

/** PostgreSQL implementation of the routes storage port, through Drizzle. */
export function createRoutesRepository(db: Database, checks: ChecksReader): RoutesRepository {
  return {
    services: () => db.select(serviceColumns).from(services).orderBy(services.name),
    serviceBySlug: async (slug) =>
      (await db.select(serviceColumns).from(services).where(eq(services.slug, slug)).limit(1))[0] ??
      null,
    insertRoute: (route) => insertRoute(db, route),
    updateRoute: (id, patch, editorId, at) => updateRoute(db, id, patch, editorId, at),
    softDelete: (id, at) => softDelete(db, id, at),
    list: (filters) => listRoutes(db, checks, filters),
    ...readQueries(db, checks),
  };
}
