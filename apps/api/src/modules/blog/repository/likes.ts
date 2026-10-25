import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { at, rows } from "./sql.js";

const countOf = async (db: Database, commentId: string): Promise<number> => {
  const [row] = await rows<{ n: number }>(
    db,
    sql`select count(*)::int as n from comment_likes where comment_id = ${commentId}`,
  );
  return row?.n ?? 0;
};

/** The primary key settles two simultaneous clicks; null means nothing changed. */
async function addLike(db: Database, commentId: string, userId: string, when: Date) {
  const inserted = await rows(
    db,
    sql`insert into comment_likes (comment_id, user_id, created_at)
      values (${commentId}, ${userId}, ${at(when)}) on conflict do nothing returning comment_id`,
  );
  return inserted.length === 0 ? null : countOf(db, commentId);
}

async function removeLike(db: Database, commentId: string, userId: string) {
  await db.execute(
    sql`delete from comment_likes where comment_id = ${commentId} and user_id = ${userId}`,
  );
  return countOf(db, commentId);
}

async function likedBy(db: Database, userId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const list = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
  const found = await rows<{ id: string }>(
    db,
    sql`select comment_id as id from comment_likes where user_id = ${userId} and comment_id in (${list})`,
  );
  return new Set(found.map((row) => row.id));
}

export function likeQueries(db: Database) {
  return {
    addLike: (commentId: string, userId: string, when: Date) =>
      addLike(db, commentId, userId, when),
    removeLike: (commentId: string, userId: string) => removeLike(db, commentId, userId),
    likedBy: (userId: string, ids: string[]) => likedBy(db, userId, ids),
  };
}
