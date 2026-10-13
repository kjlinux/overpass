import { and, count, countDistinct, desc, eq, gt, gte, ne, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import type { PotholeStatus } from "@overpass/shared";
import type { ChecksRepository, NewCheck, NewPothole } from "./model.js";
import { checks, potholes } from "./tables.js";

async function lastCheckAt(db: Database, userId: string, routeId: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: checks.checkedAt })
    .from(checks)
    .where(and(eq(checks.userId, userId), eq(checks.routeId, routeId)))
    .orderBy(desc(checks.checkedAt))
    .limit(1);
  return row?.at ?? null;
}

/** The advisory lock makes two simultaneous clicks of one account produce a single check. */
async function insertCheckUnlessRecent(db: Database, check: NewCheck, since: Date) {
  return db.transaction(async (tx) => {
    const key = `${check.userId}:${check.routeId}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
    const recent = await tx
      .select({ id: checks.id })
      .from(checks)
      .where(
        and(
          eq(checks.userId, check.userId),
          eq(checks.routeId, check.routeId),
          gt(checks.checkedAt, since),
        ),
      )
      .limit(1);
    if (recent.length > 0) return null;
    const [created] = await tx.insert(checks).values(check).returning();
    return created ?? null;
  });
}

async function countByUser(db: Database, userId: string) {
  const [checked] = await db.select({ n: count() }).from(checks).where(eq(checks.userId, userId));
  const [confirmed] = await db
    .select({ n: count() })
    .from(potholes)
    .where(and(eq(potholes.userId, userId), eq(potholes.status, "confirmed")));
  return { checks: checked?.n ?? 0, potholes: confirmed?.n ?? 0 };
}

function listChecks(
  db: Database,
  column: typeof checks.routeId | typeof checks.userId,
  value: string,
  limit: number,
) {
  return db
    .select()
    .from(checks)
    .where(eq(column, value))
    .orderBy(desc(checks.checkedAt))
    .limit(limit);
}

/** True for the partial unique index that allows one unresolved pothole per account and route. */
function isDuplicateReport(error: unknown): boolean {
  return [error, (error as { cause?: unknown } | null)?.cause].some((candidate) => {
    const { code, constraint } = (candidate ?? {}) as { code?: string; constraint?: string };
    return code === "23505" && constraint === "potholes_one_unresolved_per_user";
  });
}

async function nullOnDuplicate<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (isDuplicateReport(error)) return null;
    throw error;
  }
}

const potholesShown = 100;

function potholeQueries(db: Database) {
  return {
    insertPothole: ({ at, ...pothole }: NewPothole) =>
      nullOnDuplicate(async () => {
        const values = { ...pothole, createdAt: at, updatedAt: at };
        const [created] = await db.insert(potholes).values(values).returning();
        if (created === undefined) throw new Error("pothole insert returned nothing");
        return created;
      }),
    findPothole: async (id: string) =>
      (await db.select().from(potholes).where(eq(potholes.id, id)).limit(1))[0] ?? null,
    setPotholeStatus: (id: string, status: PotholeStatus, at: Date) =>
      nullOnDuplicate(async () => {
        const [updated] = await db
          .update(potholes)
          .set({ status, updatedAt: at })
          .where(eq(potholes.id, id))
          .returning();
        if (updated === undefined) throw new Error("pothole update returned nothing");
        return updated;
      }),
    potholesForRoute: (routeId: string) =>
      db
        .select()
        .from(potholes)
        .where(eq(potholes.routeId, routeId))
        .orderBy(sql`${potholes.status} = 'resolved'`, desc(potholes.createdAt))
        .limit(potholesShown),
  };
}

/** The same counts as the SQL state condition, for one route. */
async function stateCounts(db: Database, routeId: string, since: Date) {
  const recent = and(eq(checks.routeId, routeId), gte(checks.checkedAt, since));
  const [checked] = await db
    .select({ n: countDistinct(checks.userId) })
    .from(checks)
    .where(recent);
  const unresolved = and(eq(potholes.routeId, routeId), ne(potholes.status, "resolved"));
  const [open] = await db.select({ n: count() }).from(potholes).where(unresolved);
  return { recentCheckers: checked?.n ?? 0, unresolvedPotholes: open?.n ?? 0 };
}

/** PostgreSQL implementation of the checks storage port, through Drizzle. */
export function createChecksRepository(db: Database): ChecksRepository {
  return {
    lastCheckAt: (userId, routeId) => lastCheckAt(db, userId, routeId),
    insertCheckUnlessRecent: (check, since) => insertCheckUnlessRecent(db, check, since),
    checksForRoute: (routeId, limit) => listChecks(db, checks.routeId, routeId, limit),
    checksByUser: (userId, limit) => listChecks(db, checks.userId, userId, limit),
    ...potholeQueries(db),
    countByUser: (userId) => countByUser(db, userId),
    stateCounts: (routeId, since) => stateCounts(db, routeId, since),
  };
}
