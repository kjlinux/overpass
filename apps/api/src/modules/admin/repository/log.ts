import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { exactAt } from "../cursor.js";
import type { AdminRepository, LogRow } from "../model.js";
import { before, rows, toDate } from "./sql.js";

type LogPart = Pick<AdminRepository, "insertLog" | "log">;

/** Insert-only by design: nothing in the code updates or deletes a decision. */
export function logQueries(db: Database): LogPart {
  return {
    insertLog: async (entry) => {
      await db.execute(sql`insert into moderation_actions
          (actor_id, target_kind, target_id, action, reason)
        values (${entry.actorId}, ${entry.targetKind}, ${entry.targetId}, ${entry.action},
          ${entry.reason ?? null})`);
    },
    log: async (after, limit) => {
      const raw = await rows<Omit<LogRow, "createdAt"> & { createdAt: Date | string }>(
        db,
        sql`select m.id, u.handle as actor, m.target_kind as "targetKind", m.target_id as "targetId",
            m.action, m.reason, m.created_at as "createdAt",
            ${exactAt(sql`m.created_at`)} as "cursorAt"
          from moderation_actions m left join users u on u.id = m.actor_id
          where ${before(sql`m.created_at`, sql`m.id`, after)}
          order by m.created_at desc, m.id desc limit ${limit + 1}`,
      );
      return raw.map((row) => ({ ...row, createdAt: toDate(row.createdAt) }));
    },
  };
}
