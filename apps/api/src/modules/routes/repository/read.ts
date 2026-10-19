import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { ChecksReader } from "../../checks/index.js";
import type { RoutesRepository } from "../model.js";
import { routeReports, routes } from "../tables.js";
import { liveRows } from "./select.js";
import { listedRoute } from "./visibility.js";

const live = isNull(routes.deletedAt);
const listed = listedRoute();

type ReadPart = Pick<
  RoutesRepository,
  | "findLive"
  | "findListed"
  | "findRow"
  | "translations"
  | "sibling"
  | "byAuthor"
  | "countByAuthor"
  | "titles"
  | "insertReport"
>;

async function titles(db: Database, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: routes.id, title: routes.title })
    .from(routes)
    .where(and(inArray(routes.id, [...new Set(ids)]), listed));
  return new Map(rows.map((row) => [row.id, row.title]));
}

async function insertReport(
  db: Database,
  { at, ...report }: { routeId: string; userId: string; reason: string; at: Date },
): Promise<boolean> {
  const values = { ...report, createdAt: at };
  const rows = await db.insert(routeReports).values(values).onConflictDoNothing().returning();
  return rows.length > 0;
}

export function readQueries(db: Database, checks: ChecksReader): ReadPart {
  const inGroup = (group: string) => and(eq(routes.translationGroup, group), listed);
  const findOne = async (id: string, rule: SQL) =>
    (
      await db
        .select()
        .from(routes)
        .where(and(eq(routes.id, id), rule))
        .limit(1)
    )[0] ?? null;
  return {
    findLive: (id) => findOne(id, live),
    findListed: (id) => findOne(id, listed),
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
      const where = and(eq(routes.authorId, authorId), listed);
      const [row] = await db.select({ n: count() }).from(routes).where(where);
      return row?.n ?? 0;
    },
    titles: (ids) => titles(db, ids),
    insertReport: (routeId, userId, reason, at) =>
      insertReport(db, { routeId, userId, reason, at }),
  };
}
