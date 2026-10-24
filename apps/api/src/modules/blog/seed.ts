import { slugFor } from "@overpass/shared";
import type { Language, PostCategory, PostKind } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { adminIdByHandle } from "../accounts/index.js";
import { mediaStore } from "../media/index.js";
import { createBlogRepository } from "./repository.js";
import { rows } from "./repository/sql.js";

export type PostSeed = {
  kind: PostKind;
  category: PostCategory;
  language: Language;
  /** Seeds that share a group are translations of one article. */
  group: string;
  title: string;
  summary: string;
  publishedAt: Date;
  content: string;
  /** Translations share one buffer, so they share one stored image. */
  cover?: Buffer | undefined;
};

type Stored = { id: string; translation_group: string; cover: string | null };
type CoverStore = (cover: Buffer | undefined) => Promise<string | undefined>;

/** Only the team's own posts count: a member may publish under the same title. */
async function stored(db: Database, authorId: string, seed: PostSeed): Promise<Stored | null> {
  const found = await rows<Stored>(
    db,
    sql`select id, translation_group, cover_media_id as cover from posts
      where author_id = ${authorId} and title = ${seed.title} and language = ${seed.language}`,
  );
  return found[0] ?? null;
}

function coverStore(db: Database, authorId: string): CoverStore {
  const store = mediaStore(db);
  const ids = new Map<Buffer, string>();
  return async (cover) => {
    if (cover === undefined) return undefined;
    const id = ids.get(cover) ?? (await store(authorId, cover));
    ids.set(cover, id);
    return id;
  };
}

/** Articles seeded before they had a cover get one; a cover set since is kept. */
async function addMissingCover(db: Database, post: Stored, seed: PostSeed, covers: CoverStore) {
  if (post.cover !== null || seed.cover === undefined) return;
  const id = await covers(seed.cover);
  await db.execute(
    sql`update posts set cover_media_id = ${id} where id = ${post.id} and cover_media_id is null`,
  );
}

/** The group of a translation already in the database, so both languages stay linked. */
async function groupOf(db: Database, authorId: string, seed: PostSeed, seeds: readonly PostSeed[]) {
  for (const sibling of seeds) {
    if (sibling === seed || sibling.group !== seed.group) continue;
    const existing = await stored(db, authorId, sibling);
    if (existing !== null) return existing.translation_group;
  }
  return undefined;
}

/** Publishes the team's articles once; a second run creates nothing. */
export async function seedPosts(
  db: Database,
  handle: string,
  seeds: readonly PostSeed[],
  at: Date,
): Promise<{ created: number }> {
  const authorId = await adminIdByHandle(db, handle);
  const repository = createBlogRepository(db);
  const covers = coverStore(db, authorId);
  let created = 0;
  for (const seed of seeds) {
    const existing = await stored(db, authorId, seed);
    if (existing !== null) {
      await addMissingCover(db, existing, seed, covers);
      continue;
    }
    const { kind, category, language, title, summary, content, publishedAt } = seed;
    await repository.insertPost({
      ...{ kind, category, language, title, summary, content, publishedAt },
      coverMediaId: await covers(seed.cover),
      authorId,
      translationGroup: await groupOf(db, authorId, seed, seeds),
      baseSlug: slugFor(title),
      status: "published",
      at,
    });
    created += 1;
  }
  return { created };
}
