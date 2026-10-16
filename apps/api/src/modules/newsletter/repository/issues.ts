import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { IssueRow, IssuesPart, NewIssue } from "../model.js";
import { at, rows, toDate, toDateOrNull } from "./sql.js";

type RawIssue = Omit<IssueRow, "createdAt" | "queuedAt" | "sentAt" | "items"> & {
  items: IssueRow["items"] | string;
  createdAt: Date | string;
  queuedAt: Date | string | null;
  sentAt: Date | string | null;
};

const columns = sql`i.id, i.number, i.language, i.subject, i.intro, i.items, i.status,
  i.created_at as "createdAt", i.queued_at as "queuedAt", i.sent_at as "sentAt", i.recipients,
  (select count(*)::int from newsletter_deliveries d
    where d.issue_id = i.id and d.status = 'sent') as delivered`;

const toIssue = (raw: RawIssue): IssueRow => ({
  ...raw,
  items: typeof raw.items === "string" ? (JSON.parse(raw.items) as IssueRow["items"]) : raw.items,
  createdAt: toDate(raw.createdAt),
  queuedAt: toDateOrNull(raw.queuedAt),
  sentAt: toDateOrNull(raw.sentAt),
});

async function issues(db: Database, where: SQL, limit: number): Promise<IssueRow[]> {
  const raw = await rows<RawIssue>(
    db,
    sql`select ${columns} from newsletter_issues i where ${where}
      order by i.created_at desc, i.number desc limit ${limit}`,
  );
  return raw.map(toIssue);
}

/** The next number of the language; the unique constraint rejects a simultaneous twin. */
async function insertIssue(db: Database, issue: NewIssue): Promise<string> {
  const [row] = await rows<{ id: string }>(
    db,
    sql`insert into newsletter_issues (number, language, subject, intro, items, created_by, created_at)
      select coalesce(max(number), 0) + 1, ${issue.language}, ${issue.subject}, ${issue.intro},
        ${JSON.stringify(issue.items)}::jsonb, ${issue.createdBy}, ${at(issue.at)}
      from newsletter_issues where language = ${issue.language}
      returning id`,
  );
  if (row === undefined) throw new Error("issue insert returned nothing");
  return row.id;
}

/** Recipients are fixed at queueing time; a reader who leaves later is skipped by the worker. */
function queueIssue(db: Database, id: string, when: Date): Promise<number | null> {
  return db.transaction(async (tx) => {
    const [issue] = await rows<{ language: string }>(
      tx,
      sql`update newsletter_issues set status = 'queued', queued_at = ${at(when)}
        where id = ${id} and status = 'draft' returning language`,
    );
    if (issue === undefined) return null;
    const queued = await rows(
      tx,
      sql`insert into newsletter_deliveries (issue_id, subscriber_id, due_at)
        select ${id}, s.id, ${at(when)} from newsletter_subscribers s
        where s.language = ${issue.language} and s.confirmed_at is not null
          and s.unsubscribed_at is null
        returning id`,
    );
    const done = queued.length === 0 ? sql`, status = 'sent', sent_at = ${at(when)}` : sql``;
    await tx.execute(
      sql`update newsletter_issues set recipients = ${queued.length} ${done} where id = ${id}`,
    );
    return queued.length;
  });
}

export function issueQueries(db: Database): IssuesPart {
  return {
    insertIssue: (issue) => insertIssue(db, issue),
    updateIssue: async (id, patch) => {
      const set = [
        patch.subject === undefined ? undefined : sql`subject = ${patch.subject}`,
        patch.intro === undefined ? undefined : sql`intro = ${patch.intro}`,
        patch.items === undefined ? undefined : sql`items = ${JSON.stringify(patch.items)}::jsonb`,
      ].filter((part) => part !== undefined);
      if (set.length === 0) return;
      await db.execute(sql`update newsletter_issues set ${sql.join(set, sql`, `)}
        where id = ${id} and status = 'draft'`);
    },
    findIssue: async (id) => (await issues(db, sql`i.id = ${id}`, 1))[0] ?? null,
    listIssues: (limit) => issues(db, sql`true`, limit),
    queueIssue: (id, when) => queueIssue(db, id, when),
  };
}
