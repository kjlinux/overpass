import type { Language } from "@overpass/shared";
import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { adminIdByHandle } from "../accounts/index.js";
import { serviceCatalogue } from "./repository/catalogue.js";
import { insertRoute } from "./repository/write.js";
import { routes } from "./tables.js";

export type RouteSeed = {
  service: string;
  country: string;
  stack: string;
  language: Language;
  title: string;
  content: string;
};

/** Create only: an itinerary already there keeps its title and content, members may have edited it. */
async function exists(db: Database, authorId: string, serviceId: string, seed: RouteSeed) {
  const found = await db
    .select({ id: routes.id })
    .from(routes)
    .where(
      and(
        eq(routes.authorId, authorId),
        eq(routes.serviceId, serviceId),
        eq(routes.country, seed.country),
        eq(routes.stack, seed.stack),
        eq(routes.language, seed.language),
        isNull(routes.deletedAt),
      ),
    )
    .limit(1);
  return found.length > 0;
}

/** Writes the team's itineraries once; a second run creates nothing. */
export async function seedRoutes(
  db: Database,
  handle: string,
  seeds: readonly RouteSeed[],
  at: Date,
): Promise<{ created: number }> {
  const authorId = await adminIdByHandle(db, handle);
  const catalogue = serviceCatalogue(db);
  let created = 0;
  for (const seed of seeds) {
    const service = await catalogue.bySlug(seed.service);
    if (service === null) throw new Error(`unknown service ${seed.service}`);
    if (await exists(db, authorId, service.id, seed)) continue;
    const { country, stack, language, title, content } = seed;
    await insertRoute(db, {
      ...{ country, stack, language, title, content },
      authorId,
      serviceId: service.id,
      createdAt: at,
      updatedAt: at,
    });
    created += 1;
  }
  return { created };
}
