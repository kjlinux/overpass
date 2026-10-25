import type { Language } from "@overpass/shared";
import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { adminIdByHandle } from "../accounts/index.js";
import { serviceCatalogue } from "./repository/catalogue.js";
import { insertRoute, updateRoute } from "./repository/write.js";
import { routes } from "./tables.js";

export type RouteSeed = {
  service: string;
  country: string;
  stack: string;
  language: Language;
  title: string;
  content: string;
};

type Outcome = "created" | "updated" | "kept";

async function findTeamRoute(db: Database, authorId: string, serviceId: string, seed: RouteSeed) {
  const [found] = await db
    .select({
      id: routes.id,
      version: routes.version,
      title: routes.title,
      content: routes.content,
    })
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
  return found;
}

/** Only a first version is the team's own text: once anyone edits it, the seed leaves it alone. */
async function seedOne(
  db: Database,
  authorId: string,
  serviceId: string,
  seed: RouteSeed,
  at: Date,
) {
  const { country, stack, language, title, content } = seed;
  const found = await findTeamRoute(db, authorId, serviceId, seed);
  if (found === undefined) {
    const route = { country, stack, language, title, content, authorId, serviceId };
    await insertRoute(db, { ...route, createdAt: at, updatedAt: at });
    return "created" satisfies Outcome;
  }
  const unchanged = found.title === title && found.content === content;
  if (found.version !== 1 || unchanged) return "kept" satisfies Outcome;
  const written = await updateRoute(db, found.id, { title, content }, authorId, at, 1);
  return written ? ("updated" satisfies Outcome) : ("kept" satisfies Outcome);
}

/** Writes the team's itineraries; a second run with the same files changes nothing. */
export async function seedRoutes(
  db: Database,
  handle: string,
  seeds: readonly RouteSeed[],
  at: Date,
): Promise<{ created: number; updated: number }> {
  const authorId = await adminIdByHandle(db, handle);
  const catalogue = serviceCatalogue(db);
  const counts = { created: 0, updated: 0 };
  for (const seed of seeds) {
    const service = await catalogue.bySlug(seed.service);
    if (service === null) throw new Error(`unknown service ${seed.service}`);
    const outcome = await seedOne(db, authorId, service.id, seed, at);
    if (outcome !== "kept") counts[outcome] += 1;
  }
  return counts;
}
