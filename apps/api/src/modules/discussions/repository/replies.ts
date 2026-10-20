import { and, asc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { DiscussionsRepository, NewReply, ReplyWindow } from "../model.js";
import { replies, replyVotes, threads } from "../tables.js";

type ReplyPart = Pick<
  DiscussionsRepository,
  "insertReply" | "findReply" | "repliesOf" | "countRepliesOf" | "votedBy" | "insertVote"
>;

/** The plain bound lets replies_thread_idx narrow the scan; the row comparison breaks ties. */
function windowConditions(threadId: string, window: ReplyWindow): SQL[] {
  const { after, withRemoved } = window;
  return [
    eq(replies.threadId, threadId),
    withRemoved ? undefined : ne(replies.status, "removed"),
    after === undefined ? undefined : gte(replies.createdAt, after.at),
    after === undefined
      ? undefined
      : sql`(${replies.createdAt}, ${replies.id}) > (${after.at.toISOString()}::timestamptz, ${after.id}::uuid)`,
  ].filter((condition): condition is SQL => condition !== undefined);
}

function insertReply(db: Database, { at, ...reply }: NewReply) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(replies)
      .values({ ...reply, createdAt: at })
      .returning();
    if (created === undefined) throw new Error("reply insert returned nothing");
    await tx.update(threads).set({ lastActivityAt: at }).where(eq(threads.id, reply.threadId));
    return created;
  });
}

/** The primary key settles two simultaneous clicks; only the first one counts. */
function insertVote(db: Database, replyId: string, userId: string, at: Date) {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(replyVotes)
      .values({ replyId, userId, createdAt: at })
      .onConflictDoNothing()
      .returning({ replyId: replyVotes.replyId });
    if (inserted.length === 0) return null;
    const [updated] = await tx
      .update(replies)
      .set({ usefulCount: sql`${replies.usefulCount} + 1` })
      .where(eq(replies.id, replyId))
      .returning({ useful: replies.usefulCount });
    return updated?.useful ?? null;
  });
}

async function votedBy(db: Database, userId: string, replyIds: string[]) {
  if (replyIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ id: replyVotes.replyId })
    .from(replyVotes)
    .where(and(eq(replyVotes.userId, userId), inArray(replyVotes.replyId, replyIds)));
  return new Set(rows.map((row) => row.id));
}

export function replyQueries(db: Database): ReplyPart {
  return {
    insertReply: (reply) => insertReply(db, reply),
    findReply: async (id) =>
      (await db.select().from(replies).where(eq(replies.id, id)).limit(1))[0] ?? null,
    repliesOf: (threadId, window) =>
      db
        .select()
        .from(replies)
        .where(and(...windowConditions(threadId, window)))
        .orderBy(asc(replies.createdAt), asc(replies.id))
        .limit(window.limit + 1),
    countRepliesOf: async (threadId, withRemoved) => {
      const where = and(...windowConditions(threadId, { withRemoved, limit: 0 }));
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(replies)
        .where(where);
      return row?.count ?? 0;
    },
    votedBy: (userId, replyIds) => votedBy(db, userId, replyIds),
    insertVote: (replyId, userId, at) => insertVote(db, replyId, userId, at),
  };
}
