import type { BlogContentKind } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { ModerationPart, ModerationRow } from "../model.js";
import { at, rows, toDate } from "./sql.js";

const tableOf = (kind: BlogContentKind) => sql.raw(kind === "post" ? "posts" : "post_comments");

const openOn = (kind: BlogContentKind, id: string) =>
  sql`kind = ${kind} and target_id = ${id} and resolved_at is null`;

/** The row lock serialises two simultaneous reports, so the second one always sees the first. */
function report(db: Database, kind: BlogContentKind, id: string, userId: string, when: Date) {
  return db.transaction(async (tx) => {
    const scoped = tx as unknown as Database;
    await scoped.execute(sql`select id from ${tableOf(kind)} where id = ${id} for update`);
    const inserted = await rows(
      scoped,
      sql`insert into post_reports (kind, target_id, user_id, created_at)
        values (${kind}, ${id}, ${userId}, ${at(when)}) on conflict do nothing returning id`,
    );
    if (inserted.length === 0) return null;
    const [row] = await rows<{ n: number }>(
      scoped,
      sql`select count(*)::int as n from post_reports where ${openOn(kind, id)}`,
    );
    return row?.n ?? 0;
  });
}

/** Comment counters only count visible comments, so a decision recounts them. */
async function setModeration(db: Database, kind: BlogContentKind, id: string, status: string) {
  await db.execute(sql`update ${tableOf(kind)} set moderation = ${status} where id = ${id}`);
  if (kind === "post") return;
  await db.execute(sql`update posts p set comment_count = (select count(*) from post_comments c
      where c.post_id = p.id and c.moderation = 'visible')
    where p.id = (select post_id from post_comments where id = ${id})`);
}

async function queue(db: Database, limit: number): Promise<ModerationRow[]> {
  const raw = await rows<ModerationRow & { lastReportAt: Date | string }>(
    db,
    sql`select q.kind, q.id, coalesce(p.slug, cp.slug) as "postSlug",
        coalesce(p.title, cp.title) as title, left(coalesce(p.summary, c.content), 280) as excerpt,
        u.handle as "authorHandle", coalesce(p.moderation, c.moderation) as moderation,
        q.reports, q.last_report_at as "lastReportAt"
      from (select kind, target_id as id, count(*)::int as reports, max(created_at) as last_report_at
        from post_reports where resolved_at is null group by kind, target_id) q
      left join posts p on q.kind = 'post' and p.id = q.id
      left join post_comments c on q.kind = 'comment' and c.id = q.id
      left join posts cp on cp.id = c.post_id
      left join users u on u.id = coalesce(p.author_id, c.author_id)
      where coalesce(p.moderation, c.moderation) in ('visible', 'hidden')
      order by q.reports desc, q.last_report_at desc limit ${limit}`,
  );
  return raw.map((row) => ({ ...row, lastReportAt: toDate(row.lastReportAt) }));
}

export function moderationQueries(db: Database): ModerationPart {
  return {
    report: (kind, id, userId, when) => report(db, kind, id, userId, when),
    reportedBy: async (userId, kind, ids) => {
      if (ids.length === 0) return new Set();
      const mine = await rows<{ id: string }>(
        db,
        sql`select target_id as id from post_reports where user_id = ${userId} and kind = ${kind}
          and resolved_at is null and target_id in (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `,
          )})`,
      );
      return new Set(mine.map((row) => row.id));
    },
    setModeration: (kind, id, status) => setModeration(db, kind, id, status),
    resolveReports: async (kind, id, when) => {
      await db.execute(
        sql`update post_reports set resolved_at = ${at(when)} where ${openOn(kind, id)}`,
      );
    },
    queue: (limit) => queue(db, limit),
    setSuspended: async (userId, by, suspended, when) => {
      await db.execute(
        suspended
          ? sql`insert into blog_suspensions (user_id, suspended_by, suspended_at)
              values (${userId}, ${by}, ${at(when)}) on conflict do nothing`
          : sql`delete from blog_suspensions where user_id = ${userId}`,
      );
    },
  };
}
