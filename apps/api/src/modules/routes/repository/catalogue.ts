import { eq, inArray } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { serviceCountries, services } from "../tables.js";

type Category = "payment" | "sms" | "ussd";

export type CatalogueEntry = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  simulated: boolean;
};

export type NewService = { name: string; category: Category; country: string };

/** What other modules may read and add to the list of services. */
export type ServiceCatalogue = {
  bySlug(slug: string): Promise<CatalogueEntry | null>;
  byIds(ids: string[]): Promise<Map<string, CatalogueEntry>>;
  /** Adds a service without simulator; its country stays unconfirmed until a route clears it. */
  create(service: NewService): Promise<CatalogueEntry>;
};

const columns = {
  id: services.id,
  slug: services.slug,
  name: services.name,
  category: services.category,
  simulated: services.simulated,
};

/** A readable identifier: no accents, lower case, words joined by hyphens. */
export function slugOf(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36)
    .replace(/-+$/, "");
  return slug.length >= 2 ? slug : "service";
}

async function insertUnique(db: Database, service: NewService): Promise<CatalogueEntry> {
  const base = slugOf(service.name);
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const slug = attempt === 1 ? base : `${base}-${String(attempt)}`;
    const values = { slug, name: service.name, category: service.category, simulated: false };
    const [created] = await db
      .insert(services)
      .values(values)
      .onConflictDoNothing()
      .returning(columns);
    if (created === undefined) continue;
    const country = {
      serviceId: created.id,
      country: service.country,
      basis: "community" as const,
    };
    await db.insert(serviceCountries).values(country).onConflictDoNothing();
    return created;
  }
  throw new Error(`no free slug for ${base}`);
}

export function serviceCatalogue(db: Database): ServiceCatalogue {
  return {
    bySlug: async (slug) =>
      (await db.select(columns).from(services).where(eq(services.slug, slug)).limit(1))[0] ?? null,
    byIds: async (ids) => {
      if (ids.length === 0) return new Map();
      const rows = await db
        .select(columns)
        .from(services)
        .where(inArray(services.id, [...new Set(ids)]));
      return new Map(rows.map((row) => [row.id, row]));
    },
    create: (service) => db.transaction((tx) => insertUnique(tx as unknown as Database, service)),
  };
}
