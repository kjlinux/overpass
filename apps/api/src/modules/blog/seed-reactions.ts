import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import type { BlogRepository } from "./model.js";
import { rows } from "./repository/sql.js";

export type Comment = {
  author: string;
  at: Date;
  likes?: readonly string[] | undefined;
  content: string;
};
export type Reactions = {
  stars?: readonly string[] | undefined;
  comments?: readonly Comment[] | undefined;
};
type Authors = ReadonlyMap<string, string>;
export type Reaction = { postId: string; seed: Reactions; authors: Authors; at: Date };

export function idOf(authors: Authors, handle: string): string {
  const id = authors.get(handle);
  if (id === undefined) throw new Error(`unknown author in the seed: ${handle}`);
  return id;
}

/** A comment already written by the same member at the same minute is the same comment. */
async function commentId(db: Database, postId: string, authorId: string, at: Date) {
  const [found] = await rows<{ id: string }>(
    db,
    sql`select id from post_comments
      where post_id = ${postId} and author_id = ${authorId} and created_at = ${at.toISOString()}`,
  );
  return found?.id;
}

/** Idempotent: a star, a comment or a like that exists is left alone, so a rerun only adds the new. */
export async function addReactions(
  db: Database,
  repository: BlogRepository,
  reaction: Reaction,
): Promise<void> {
  const { postId, seed, authors, at } = reaction;
  for (const star of seed.stars ?? []) {
    await repository.addStar(postId, idOf(authors, star), at);
  }
  for (const comment of seed.comments ?? []) {
    const authorId = idOf(authors, comment.author);
    const id =
      (await commentId(db, postId, authorId, comment.at)) ??
      (await repository.insertComment(postId, authorId, comment.content, comment.at)).id;
    for (const fan of comment.likes ?? []) {
      await repository.addLike(id, idOf(authors, fan), comment.at);
    }
  }
}

/** A post whose reactions failed is removed, so the next run writes it whole instead of skipping it. */
export async function reactOrWithdraw(
  db: Database,
  repository: BlogRepository,
  reaction: Reaction,
): Promise<void> {
  try {
    await addReactions(db, repository, reaction);
  } catch (error) {
    await db.execute(sql`delete from posts where id = ${reaction.postId}`);
    throw error;
  }
}
