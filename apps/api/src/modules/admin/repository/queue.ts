import type { QueueKind, QueueState } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { exactAt } from "../cursor.js";
import type { AdminCursor } from "../cursor.js";
import type { AdminRepository, QueueRow } from "../model.js";
import { before, rows, toDateOrNull } from "./sql.js";

const excerptLength = 280;

type Source = {
  id: SQL;
  title: SQL;
  excerpt: SQL;
  authorId: SQL;
  status: SQL;
  path: SQL;
  from: SQL;
  reports: SQL;
  live: SQL;
};

const openReports = (table: "reports" | "post_reports", kind: QueueKind) =>
  sql`select target_id, count(*)::int as reports, max(created_at) as last_report_at
    from ${sql.raw(table)} where kind = ${kind} and resolved_at is null group by target_id`;

/** Every report on an itinerary is open: a restore decision deletes them. */
const routeReports = sql`select route_id as target_id, count(*)::int as reports,
  max(created_at) as last_report_at from route_reports group by route_id`;

const sources: Record<QueueKind, Source> = {
  route: {
    ...{ id: sql`r.id`, title: sql`r.title`, excerpt: sql`r.content`, authorId: sql`r.author_id` },
    ...{ status: sql`r.moderation`, path: sql`'/routes/' || r.id`, from: sql`routes r` },
    ...{ reports: routeReports, live: sql`r.deleted_at is null` },
  },
  thread: {
    ...{ id: sql`t.id`, title: sql`t.title`, excerpt: sql`t.content`, authorId: sql`t.author_id` },
    ...{ status: sql`t.status`, path: sql`'/discussions/' || t.id`, from: sql`threads t` },
    ...{ reports: openReports("reports", "thread"), live: sql`true` },
  },
  reply: {
    ...{ id: sql`x.id`, title: sql`t.title`, excerpt: sql`x.content`, authorId: sql`x.author_id` },
    ...{ status: sql`x.status`, path: sql`'/discussions/' || t.id` },
    from: sql`replies x join threads t on t.id = x.thread_id`,
    ...{ reports: openReports("reports", "reply"), live: sql`t.status <> 'removed'` },
  },
  post: {
    ...{ id: sql`p.id`, title: sql`p.title`, excerpt: sql`p.summary`, authorId: sql`p.author_id` },
    ...{ status: sql`p.moderation`, path: sql`'/blog/' || p.slug`, from: sql`posts p` },
    ...{ reports: openReports("post_reports", "post"), live: sql`true` },
  },
  comment: {
    ...{ id: sql`c.id`, title: sql`p.title`, excerpt: sql`c.content`, authorId: sql`c.author_id` },
    ...{ status: sql`c.moderation`, path: sql`'/blog/' || p.slug` },
    from: sql`post_comments c join posts p on p.id = c.post_id`,
    ...{ reports: openReports("post_reports", "comment"), live: sql`true` },
  },
};

/** Removed or blocked content has left the queue for good. */
const stateCondition = (s: Source, state: QueueState): SQL =>
  state === "hidden"
    ? sql`${s.status} = 'hidden'`
    : sql`${s.status} = 'visible' and q.target_id is not null`;

function queueQuery(
  { kind, state }: { kind: QueueKind; state: QueueState },
  after: AdminCursor | undefined,
  limit: number,
): SQL {
  const s = sources[kind];
  return sql`select *, ${exactAt(sql`item."sortAt"`)} as "cursorAt" from (
      select ${kind}::text as kind, ${s.id} as id, ${s.title} as title,
        left(${s.excerpt}, ${excerptLength}) as excerpt, coalesce(u.handle, '') as author,
        coalesce(q.reports, 0)::int as reports, q.last_report_at as "lastReportAt",
        ${s.status} as status, ${s.path} as path,
        coalesce(q.last_report_at, 'epoch'::timestamptz) as "sortAt"
      from ${s.from}
      left join (${s.reports}) q on q.target_id = ${s.id}
      left join users u on u.id = ${s.authorId}
      where ${s.live} and ${stateCondition(s, state)}
    ) item
    where ${before(sql`item."sortAt"`, sql`item.id`, after)}
    order by item."sortAt" desc, item.id desc limit ${limit + 1}`;
}

type RawRow = Omit<QueueRow, "lastReportAt"> & { lastReportAt: Date | string | null };

export function queueQueries(db: Database): Pick<AdminRepository, "queue"> {
  return {
    queue: async (filter, after, limit) =>
      (await rows<RawRow>(db, queueQuery(filter, after, limit))).map((row) => ({
        ...row,
        lastReportAt: toDateOrNull(row.lastReportAt),
      })),
  };
}
