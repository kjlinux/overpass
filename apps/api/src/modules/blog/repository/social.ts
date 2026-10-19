import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { DateCursor } from "../../../http/date-cursor.js";
import type { CommentRow, Member, SocialPart } from "../model.js";
import { at, rows, toDate } from "./sql.js";

type RawComment = Omit<CommentRow, "createdAt"> & { createdAt: Date | string };

const commentColumns = sql`c.id, c.post_id as "postId", c.author_id as "authorId",
  u.handle as "authorHandle", c.content, c.moderation, c.created_at as "createdAt"`;

const toComment = (raw: RawComment): CommentRow => ({ ...raw, createdAt: toDate(raw.createdAt) });

/** The primary key settles two simultaneous clicks; the counter moves only for a real change. */
function addStar(db: Database, postId: string, userId: string, when: Date) {
  return db.transaction(async (tx) => {
    const inserted = await rows(
      tx,
      sql`insert into post_stars (post_id, user_id, created_at) values (${postId}, ${userId}, ${at(when)})
        on conflict do nothing returning post_id`,
    );
    if (inserted.length === 0) return null;
    const [row] = await rows<{ n: number }>(
      tx,
      sql`update posts set star_count = star_count + 1 where id = ${postId} returning star_count as n`,
    );
    return row?.n ?? null;
  });
}

/** The delete trigger moves the counter, so a cascade from a deleted account moves it too. */
async function removeStar(db: Database, postId: string, userId: string) {
  const deleted = await rows(
    db,
    sql`delete from post_stars where post_id = ${postId} and user_id = ${userId} returning post_id`,
  );
  if (deleted.length === 0) return null;
  const [row] = await rows<{ n: number }>(
    db,
    sql`select star_count as n from posts where id = ${postId}`,
  );
  return row?.n ?? null;
}

function insertComment(
  db: Database,
  postId: string,
  authorId: string,
  content: string,
  when: Date,
) {
  return db.transaction(async (tx) => {
    const [created] = await rows<{ id: string }>(
      tx,
      sql`insert into post_comments (post_id, author_id, content, created_at)
        values (${postId}, ${authorId}, ${content}, ${at(when)}) returning id`,
    );
    await tx.execute(sql`update posts set comment_count = comment_count + 1 where id = ${postId}`);
    if (created === undefined) throw new Error("comment insert returned nothing");
    return created.id;
  });
}

async function comments(
  db: Database,
  postId: string,
  after: DateCursor | undefined,
  limit: number,
) {
  const page =
    after === undefined ? sql`true` : sql`(c.created_at, c.id) > (${at(after.at)}, ${after.id})`;
  const raw = await rows<RawComment>(
    db,
    sql`select ${commentColumns} from post_comments c left join users u on u.id = c.author_id
      where c.post_id = ${postId} and ${page} order by c.created_at, c.id limit ${limit + 1}`,
  );
  return raw.map(toComment);
}

const exists = async (db: Database, query: SQL): Promise<boolean> =>
  (await rows(db, query)).length > 0;

function starQueries(db: Database) {
  return {
    addStar: (postId: string, userId: string, when: Date) => addStar(db, postId, userId, when),
    removeStar: (postId: string, userId: string) => removeStar(db, postId, userId),
    hasStarred: (postId: string, userId: string) =>
      exists(db, sql`select 1 from post_stars where post_id = ${postId} and user_id = ${userId}`),
  };
}

function commentQueries(db: Database) {
  const findComment = async (id: string) => {
    const raw = await rows<RawComment>(
      db,
      sql`select ${commentColumns} from post_comments c left join users u on u.id = c.author_id
        where c.id = ${id}`,
    );
    return raw[0] === undefined ? null : toComment(raw[0]);
  };
  const insert = async (postId: string, authorId: string, content: string, when: Date) => {
    const created = await findComment(await insertComment(db, postId, authorId, content, when));
    if (created === null) throw new Error("comment vanished after insert");
    return created;
  };
  const list = (postId: string, after: DateCursor | undefined, limit: number) =>
    comments(db, postId, after, limit);
  return { insertComment: insert, findComment, comments: list };
}

function followQueries(db: Database) {
  const pair = (followerId: string, followeeId: string) =>
    sql`follower_id = ${followerId} and followee_id = ${followeeId}`;
  return {
    follow: async (followerId: string, followeeId: string, when: Date) => {
      await db.execute(sql`insert into follows (follower_id, followee_id, created_at)
        values (${followerId}, ${followeeId}, ${at(when)}) on conflict do nothing`);
    },
    unfollow: async (followerId: string, followeeId: string) => {
      await db.execute(sql`delete from follows where ${pair(followerId, followeeId)}`);
    },
    isFollowing: (followerId: string, followeeId: string) =>
      exists(db, sql`select 1 from follows where ${pair(followerId, followeeId)}`),
    followers: async (userId: string) => {
      const query = sql`select count(*)::int as n from follows where followee_id = ${userId}`;
      return (await rows<{ n: number }>(db, query))[0]?.n ?? 0;
    },
    following: async (followerId: string) => {
      const raw = await rows<Member & { followedAt: Date | string }>(
        db,
        sql`select u.id, u.handle, trim(u.country) as country, f.created_at as "followedAt"
          from follows f join users u on u.id = f.followee_id
          where f.follower_id = ${followerId} order by f.created_at desc, u.handle`,
      );
      return raw.map((row) => ({ ...row, followedAt: toDate(row.followedAt) }));
    },
  };
}

export function socialQueries(db: Database): SocialPart {
  return { ...starQueries(db), ...commentQueries(db), ...followQueries(db) };
}
