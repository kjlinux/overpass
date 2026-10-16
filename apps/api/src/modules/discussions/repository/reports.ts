import type { ContentKind } from "@overpass/shared";
import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { DiscussionsRepository, ModerationRow } from "../model.js";
import { replies, reports, threads } from "../tables.js";

type ReportPart = Pick<
  DiscussionsRepository,
  "insertReport" | "openReports" | "reportedBy" | "setStatus" | "resolveReports" | "moderationQueue"
>;

const openOn = (kind: ContentKind, targetId: string) =>
  and(eq(reports.kind, kind), eq(reports.targetId, targetId), isNull(reports.resolvedAt));

/** Open reports with what a moderator needs to decide, most reported first. */
async function moderationQueue(db: Database, limit: number): Promise<ModerationRow[]> {
  const result: unknown = await db.execute(sql`
    select q.kind, q.id, coalesce(t.id, rt.id) as "threadId", coalesce(t.title, rt.title) as title,
      left(coalesce(t.content, rp.content), 280) as excerpt,
      coalesce(t.author_id, rp.author_id) as "authorId", coalesce(t.status, rp.status) as status,
      q.reports, q.last_report_at as "lastReportAt"
    from (select kind, target_id as id, count(*)::int as reports, max(created_at) as last_report_at
      from reports where resolved_at is null group by kind, target_id) q
    left join threads t on q.kind = 'thread' and t.id = q.id
    left join replies rp on q.kind = 'reply' and rp.id = q.id
    left join threads rt on rt.id = rp.thread_id
    where coalesce(t.status, rp.status) is not null and coalesce(t.status, rp.status) <> 'removed'
      and coalesce(rt.status, 'visible') <> 'removed'
    order by q.reports desc, q.last_report_at desc
    limit ${limit}`);
  const rows = (result as { rows: (ModerationRow & { lastReportAt: string | Date })[] }).rows;
  return rows.map((row) => ({ ...row, lastReportAt: new Date(row.lastReportAt) }));
}

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
    moderationQueue: (limit) => moderationQueue(db, limit),
  };
}
