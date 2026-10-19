import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { PostRow } from "../model.js";

export async function rows<Row>(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

export const toDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

export const toDateOrNull = (value: Date | string | null): Date | null =>
  value === null ? null : toDate(value);

export const at = (date: Date): SQL => sql`${date.toISOString()}::timestamptz`;

const suspendedAuthor = (alias: string) =>
  sql`exists (select 1 from blog_suspensions s where s.user_id = ${sql.raw(alias)}.author_id)`;

/** The single visibility rule shared by the feeds, the blogs, RSS and the newsletter. */
export function listed(alias: "p" | "t", now: SQL): SQL {
  const a = sql.raw(alias);
  return sql`${a}.status = 'published' and ${a}.moderation = 'visible'
    and ${a}.published_at <= ${now} and not ${suspendedAuthor(alias)}`;
}

const translationColumn = sql`(select json_build_object('language', t.language, 'slug', t.slug)
  from posts t where t.translation_group = p.translation_group and t.id <> p.id
    and ${listed("t", sql`now()`)} limit 1)`;

/** Lists skip the Markdown body, which only the detail needs. */
export function postColumns(withContent: boolean): SQL {
  return sql`p.id, p.kind, p.author_id as "authorId", u.handle as "authorHandle",
    trim(u.country) as "authorCountry", p.language, p.translation_group as "translationGroup",
    p.slug, p.category, p.title, p.summary, ${withContent ? sql`p.content` : sql`''`} as content,
    p.status, p.moderation, p.published_at as "publishedAt", p.star_count as "starCount",
    p.comment_count as "commentCount", p.updated_at as "updatedAt",
    ${suspendedAuthor("p")} as suspended, ${translationColumn} as translation`;
}

export const fromPosts = sql`from posts p left join users u on u.id = p.author_id`;

type RawPost = Omit<PostRow, "publishedAt" | "updatedAt" | "translation"> & {
  publishedAt: Date | string | null;
  updatedAt: Date | string;
  translation: PostRow["translation"] | string | null;
};

export function toPost(raw: RawPost): PostRow {
  const translation =
    typeof raw.translation === "string"
      ? (JSON.parse(raw.translation) as PostRow["translation"])
      : raw.translation;
  return {
    ...raw,
    publishedAt: toDateOrNull(raw.publishedAt),
    updatedAt: toDate(raw.updatedAt),
    translation,
  };
}

export async function posts(db: Database, query: SQL): Promise<PostRow[]> {
  return (await rows<RawPost>(db, query)).map(toPost);
}
