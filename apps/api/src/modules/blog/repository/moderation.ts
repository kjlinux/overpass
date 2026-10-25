import type { BlogContentKind } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { ModerationPart } from "../model.js";
import { at, rows } from "./sql.js";

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
    const open = await rows<{ id: string }>(
      scoped,
      sql`select user_id as id from post_reports where ${openOn(kind, id)}`,
    );
    return open.map((row) => row.id);
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
