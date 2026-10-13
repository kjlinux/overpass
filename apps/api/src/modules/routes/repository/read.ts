import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { ChecksReader } from "../../checks/index.js";
import type { RoutesRepository } from "../model.js";
import { routes } from "../tables.js";
import { liveRows } from "./select.js";

const live = isNull(routes.deletedAt);

type ReadPart = Pick<
  RoutesRepository,
  "findLive" | "findRow" | "translations" | "sibling" | "byAuthor" | "countByAuthor" | "titles"
>;

async function titles(db: Database, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: routes.id, title: routes.title })
    .from(routes)
    .where(and(inArray(routes.id, [...new Set(ids)]), live));
  return new Map(rows.map((row) => [row.id, row.title]));
}

export function readQueries(db: Database, checks: ChecksReader): ReadPart {
  const inGroup = (group: string) => and(eq(routes.translationGroup, group), live);
  return {
    findLive: async (id) =>
      (
        await db
          .select()
          .from(routes)
          .where(and(eq(routes.id, id), live))
          .limit(1)
      )[0] ?? null,
    findRow: async (id) => (await liveRows(db, checks, eq(routes.id, id)).limit(1))[0] ?? null,
    translations: (group) =>
      db
        .select({ id: routes.id, language: routes.language })
        .from(routes)
        .where(inGroup(group))
        .orderBy(routes.language),
    sibling: async (group, language) => {
      const where = and(inGroup(group), eq(routes.language, language));
      const [row] = await db.select({ id: routes.id }).from(routes).where(where).limit(1);
      return row?.id ?? null;
    },
    byAuthor: (authorId, limit) =>
      liveRows(db, checks, eq(routes.authorId, authorId))
        .orderBy(desc(routes.updatedAt))
        .limit(limit),
    countByAuthor: async (authorId) => {
      const where = and(eq(routes.authorId, authorId), live);
      const [row] = await db.select({ n: count() }).from(routes).where(where);
      return row?.n ?? 0;
    },
    titles: (ids) => titles(db, ids),
  };
}
