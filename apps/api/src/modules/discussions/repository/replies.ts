import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { DiscussionsRepository, NewReply } from "../model.js";
import { replies, replyVotes, threads } from "../tables.js";

type ReplyPart = Pick<
  DiscussionsRepository,
  "insertReply" | "findReply" | "repliesOf" | "votedBy" | "insertVote"
>;

const repliesShown = 200;

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
    repliesOf: (threadId) =>
      db
        .select()
        .from(replies)
        .where(eq(replies.threadId, threadId))
        .orderBy(asc(replies.createdAt), asc(replies.id))
        .limit(repliesShown),
    votedBy: (userId, replyIds) => votedBy(db, userId, replyIds),
    insertVote: (replyId, userId, at) => insertVote(db, replyId, userId, at),
  };
}
