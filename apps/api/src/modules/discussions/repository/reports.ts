import type { ContentKind } from "@overpass/shared";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { DiscussionsRepository } from "../model.js";
import { replies, reports, threads } from "../tables.js";

type ReportPart = Pick<
  DiscussionsRepository,
  "insertReport" | "openReports" | "reportedBy" | "setStatus" | "resolveReports"
>;

const openOn = (kind: ContentKind, targetId: string) =>
  and(eq(reports.kind, kind), eq(reports.targetId, targetId), isNull(reports.resolvedAt));

export function reportQueries(db: Database): ReportPart {
  return {
    insertReport: async (kind, targetId, userId, at) => {
      const inserted = await db
        .insert(reports)
        .values({ kind, targetId, userId, createdAt: at })
        .onConflictDoNothing()
        .returning({ id: reports.id });
      return inserted.length > 0;
    },
    openReports: async (kind, targetId) => {
      const [row] = await db.select({ n: count() }).from(reports).where(openOn(kind, targetId));
      return row?.n ?? 0;
    },
    reportedBy: async (userId, kind, ids) => {
      if (ids.length === 0) return new Set();
      const mine = and(
        eq(reports.userId, userId),
        eq(reports.kind, kind),
        inArray(reports.targetId, ids),
        isNull(reports.resolvedAt),
      );
      const rows = await db.select({ id: reports.targetId }).from(reports).where(mine);
      return new Set(rows.map((row) => row.id));
    },
    setStatus: async (kind, id, status) => {
      const table = kind === "thread" ? threads : replies;
      await db.update(table).set({ status }).where(eq(table.id, id));
    },
    resolveReports: async (kind, id, at) => {
      await db.update(reports).set({ resolvedAt: at }).where(openOn(kind, id));
    },
  };
}
