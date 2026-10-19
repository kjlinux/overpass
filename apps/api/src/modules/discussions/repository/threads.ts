import { asc, desc, eq, getTableColumns, isNotNull, isNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { DiscussionsRepository, ThreadFilters } from "../model.js";
import { threads, topics } from "../tables.js";

type ThreadPart = Pick<
  DiscussionsRepository,
  "topics" | "insertThread" | "findThread" | "listThreads" | "setAccepted"
>;

/** Qualified by hand: Drizzle drops the table name of columns in single-table selects. */
const replyCount = sql<number>`(select count(*)::int from replies r
  where r.thread_id = "threads"."id" and r.status = 'visible')`.mapWith(Number);

const threadCount = sql<number>`(select count(*)::int from threads t
  where t.topic = "topics"."slug" and t.status = 'visible')`.mapWith(Number);

function stateCondition(state: ThreadFilters["state"]): SQL | undefined {
  if (state === undefined) return undefined;
  return state === "resolved"
    ? isNotNull(threads.acceptedReplyId)
    : isNull(threads.acceptedReplyId);
}

function afterCursor(after: ThreadFilters["after"]): SQL | undefined {
  if (after === undefined) return undefined;
  return sql`(${threads.lastActivityAt}, ${threads.id}) < (${after.at.toISOString()}::timestamptz, ${after.id}::uuid)`;
}

function filterConditions(filters: ThreadFilters): SQL[] {
  return [
    eq(threads.status, "visible"),
    filters.topic === undefined ? undefined : eq(threads.topic, filters.topic),
    filters.country === undefined ? undefined : eq(threads.country, filters.country),
    filters.stack === undefined ? undefined : eq(threads.stack, filters.stack),
    filters.language === undefined ? undefined : eq(threads.language, filters.language),
    filters.route === undefined ? undefined : eq(threads.routeId, filters.route),
    stateCondition(filters.state),
    afterCursor(filters.after),
  ].filter((condition): condition is SQL => condition !== undefined);
}

export function threadQueries(db: Database): ThreadPart {
  const withCount = { ...getTableColumns(threads), replies: replyCount };
  return {
    topics: () =>
      db
        .select({ ...getTableColumns(topics), threads: threadCount })
        .from(topics)
        .orderBy(asc(topics.position)),
    insertThread: async (thread) => {
      const [created] = await db.insert(threads).values(thread).returning();
      if (created === undefined) throw new Error("thread insert returned nothing");
      return created;
    },
    findThread: async (id) =>
      (await db.select(withCount).from(threads).where(eq(threads.id, id)).limit(1))[0] ?? null,
    listThreads: (filters) =>
      db
        .select(withCount)
        .from(threads)
        .where(sql.join(filterConditions(filters), sql` and `))
        .orderBy(desc(threads.lastActivityAt), desc(threads.id))
        .limit(filters.limit + 1),
    setAccepted: async (threadId, replyId) => {
      await db.update(threads).set({ acceptedReplyId: replyId }).where(eq(threads.id, threadId));
    },
  };
}
