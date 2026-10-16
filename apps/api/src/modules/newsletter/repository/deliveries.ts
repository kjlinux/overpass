import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { ClaimedDelivery, DeliveriesPart } from "../model.js";
import { at, rows } from "./sql.js";

const errorLength = 500;

/** Marks rows as sending inside the claim, so a second worker skips them once committed. */
async function claim(db: Database, batchSize: number, now: Date, staleBefore: Date) {
  await db.execute(sql`update newsletter_deliveries set status = 'pending', locked_at = null
    where status = 'sending' and locked_at < ${at(staleBefore)}`);
  return rows<ClaimedDelivery>(
    db,
    sql`update newsletter_deliveries set status = 'sending', locked_at = ${at(now)},
        attempts = attempts + 1
      where id in (select id from newsletter_deliveries
        where status = 'pending' and due_at <= ${at(now)}
        order by due_at, id limit ${batchSize} for update skip locked)
      returning id, issue_id as "issueId", subscriber_id as "subscriberId", attempts`,
  );
}

export function deliveryQueries(db: Database): DeliveriesPart {
  const set = async (id: string, fields: ReturnType<typeof sql>) => {
    await db.execute(sql`update newsletter_deliveries set ${fields}, locked_at = null
      where id = ${id}`);
  };
  return {
    claim: (batchSize, now, staleBefore) => claim(db, batchSize, now, staleBefore),
    markSent: (id, when) => set(id, sql`status = 'sent', sent_at = ${at(when)}`),
    markSkipped: (id) => set(id, sql`status = 'skipped'`),
    markRetry: (id, dueAt, error) =>
      set(
        id,
        sql`status = 'pending', due_at = ${at(dueAt)}, last_error = ${error.slice(0, errorLength)}`,
      ),
    markFailed: (id, error) =>
      set(id, sql`status = 'failed', last_error = ${error.slice(0, errorLength)}`),
    finishIssues: async (when) => {
      await db.execute(sql`update newsletter_issues i set status = 'sent', sent_at = ${at(when)}
        where i.status = 'queued' and not exists (select 1 from newsletter_deliveries d
          where d.issue_id = i.id and d.status in ('pending', 'sending'))`);
    },
  };
}
