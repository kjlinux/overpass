import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { Member, NewPost, PostPatch, PostsPart } from "../model.js";
import { at, fromPosts, postColumns, posts, rows } from "./sql.js";

/** Raised when the translation group already holds a post in that language. */
export class PostTranslationExists extends Error {}

const slugAttempts = 3;

function violated(error: unknown): string | undefined {
  for (const candidate of [error, (error as { cause?: unknown } | null)?.cause]) {
    const { code, constraint } = (candidate ?? {}) as { code?: string; constraint?: string };
    if (code === "23505") return constraint;
  }
  return undefined;
}

/** The base slug when free, otherwise the next numbered one. */
async function freeSlug(db: Database, language: string, base: string): Promise<string> {
  const taken = await rows<{ slug: string }>(
    db,
    sql`select slug from posts where language = ${language}
      and (slug = ${base} or slug ~ ${`^${base}-[0-9]+$`})`,
  );
  if (!taken.some((row) => row.slug === base)) return base;
  const numbers = taken.map((row) => Number(row.slug.slice(base.length + 1)) || 1);
  return `${base}-${String(Math.max(...numbers) + 1)}`;
}

async function insertOnce(db: Database, post: NewPost): Promise<string> {
  const slug = await freeSlug(db, post.language, post.baseSlug);
  const group = post.translationGroup ?? null;
  const [row] = await rows<{ id: string }>(
    db,
    sql`insert into posts (kind, author_id, language, translation_group, slug, category, title,
        summary, content, cover_media_id, status, published_at, created_at, updated_at)
      values (${post.kind}, ${post.authorId}, ${post.language},
        coalesce(${group}::uuid, gen_random_uuid()), ${slug}, ${post.category}, ${post.title},
        ${post.summary}, ${post.content}, ${post.coverMediaId ?? null}, ${post.status},
        ${post.publishedAt === null ? null : at(post.publishedAt)}, ${at(post.at)}, ${at(post.at)})
      returning id`,
  );
  if (row === undefined) throw new Error("post insert returned nothing");
  return row.id;
}

/** Two writers may pick the same numbered slug; the unique index settles it and we retry. */
async function insertPost(db: Database, post: NewPost): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await insertOnce(db, post);
    } catch (error) {
      const constraint = violated(error);
      if (constraint === "posts_one_per_language") throw new PostTranslationExists();
      if (constraint !== "posts_slug_per_language" || attempt >= slugAttempts) throw error;
    }
  }
}

async function updatePost(db: Database, id: string, patch: PostPatch, when: Date) {
  const set = [
    patch.category === undefined ? undefined : sql`category = ${patch.category}`,
    patch.title === undefined ? undefined : sql`title = ${patch.title}`,
    patch.summary === undefined ? undefined : sql`summary = ${patch.summary}`,
    patch.content === undefined ? undefined : sql`content = ${patch.content}`,
    patch.coverMediaId === undefined ? undefined : sql`cover_media_id = ${patch.coverMediaId}`,
    patch.status === undefined ? undefined : sql`status = ${patch.status}`,
    patch.publishedAt === undefined
      ? undefined
      : sql`published_at = ${patch.publishedAt === null ? null : at(patch.publishedAt)}`,
    sql`updated_at = ${at(when)}`,
  ].filter((part) => part !== undefined);
  await db.execute(sql`update posts set ${sql.join(set, sql`, `)} where id = ${id}`);
}

export function postQueries(db: Database): PostsPart {
  const one = async (where: ReturnType<typeof sql>) =>
    (await posts(db, sql`select ${postColumns(true)} ${fromPosts} where ${where} limit 1`))[0] ??
    null;
  return {
    insertPost: (post) => insertPost(db, post),
    updatePost: (id, patch, when) => updatePost(db, id, patch, when),
    findPost: (id) => one(sql`p.id = ${id}`),
    findBySlug: async (slug, language) =>
      (
        await posts(
          db,
          sql`select ${postColumns(true)} ${fromPosts} where p.slug = ${slug}
            order by (p.language = ${language}) desc, p.language limit 1`,
        )
      )[0] ?? null,
    postsOf: (authorId, limit) =>
      posts(
        db,
        sql`select ${postColumns(false)} ${fromPosts} where p.author_id = ${authorId}
          order by p.updated_at desc, p.id desc limit ${limit}`,
      ),
    memberByHandle: async (handle) =>
      (
        await rows<Member>(
          db,
          sql`select id, handle, trim(country) as country from users where handle = ${handle}`,
        )
      )[0] ?? null,
    isSuspended: async (userId) =>
      (await rows(db, sql`select 1 from blog_suspensions where user_id = ${userId}`)).length > 0,
  };
}
