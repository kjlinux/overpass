import { postCategories, readLocales, slugFor, supportedLanguages } from "@overpass/shared";
import type { Language, PostCategory } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { createBlogRepository } from "./repository.js";
import { rows } from "./repository/sql.js";
import type catalogue from "./locales/fr.json";

type Copy = typeof catalogue;

const texts = readLocales<Copy>(new URL("./locales/", import.meta.url));

async function adminId(db: Database, handle: string): Promise<string> {
  const [row] = await rows<{ id: string }>(
    db,
    sql`select id from users where handle = ${handle} and role = 'admin'`,
  );
  if (row === undefined) throw new Error(`no admin account with the handle ${handle}`);
  return row.id;
}

async function exists(db: Database, title: string, language: Language): Promise<boolean> {
  const found = await rows(
    db,
    sql`select 1 from posts where kind = 'news' and title = ${title} and language = ${language}`,
  );
  return found.length > 0;
}

/** The team writes the news; this only lays out one empty draft per category and language. */
async function seedCategory(db: Database, authorId: string, category: PostCategory, at: Date) {
  const repository = createBlogRepository(db);
  let group: string | undefined;
  let created = 0;
  for (const language of supportedLanguages) {
    const copy = texts[language].templates[category];
    if (await exists(db, copy.title, language)) return created;
    const id = await repository.insertPost({
      ...copy,
      kind: "news",
      authorId,
      language,
      category,
      translationGroup: group,
      baseSlug: slugFor(copy.title),
      status: "draft",
      publishedAt: null,
      at,
    });
    group = (await repository.findPost(id))?.translationGroup;
    created += 1;
  }
  return created;
}

export async function seedNewsTemplates(
  db: Database,
  handle: string,
  at: Date,
): Promise<{ created: number }> {
  const authorId = await adminId(db, handle);
  let created = 0;
  for (const category of postCategories) created += await seedCategory(db, authorId, category, at);
  return { created };
}
