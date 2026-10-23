import { slugFor } from "@overpass/shared";
import type { Language, PostCategory, PostKind } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { adminIdByHandle } from "../accounts/index.js";
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
};

type Stored = { translation_group: string };

async function stored(db: Database, seed: PostSeed): Promise<Stored | null> {
  const found = await rows<Stored>(
    db,
    sql`select translation_group from posts
      where title = ${seed.title} and language = ${seed.language}`,
  );
  return found[0] ?? null;
}

/** The group of a translation already in the database, so both languages stay linked. */
async function groupOf(db: Database, seed: PostSeed, seeds: readonly PostSeed[]) {
  for (const sibling of seeds) {
    if (sibling === seed || sibling.group !== seed.group) continue;
    const existing = await stored(db, sibling);
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
  let created = 0;
  for (const seed of seeds) {
    if ((await stored(db, seed)) !== null) continue;
    const { kind, category, language, title, summary, content, publishedAt } = seed;
    await repository.insertPost({
      ...{ kind, category, language, title, summary, content, publishedAt },
      authorId,
      translationGroup: await groupOf(db, seed, seeds),
      baseSlug: slugFor(title),
      status: "published",
      at,
    });
    created += 1;
  }
  return { created };
}
