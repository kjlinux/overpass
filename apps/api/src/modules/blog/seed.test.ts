import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { createTestDatabase } from "../../db/testing.js";
import { sampleJpeg, samplePng } from "../../testing-media.js";
import { ensureAdmin, seedMembers } from "../accounts/index.js";
import { seedPosts } from "./seed.js";

let db: Database;
let close: () => Promise<void>;
let handle: string;
const at = new Date("2026-10-23T10:00:00.000Z");

const launchFr = {
  kind: "news" as const,
  category: "tech-news" as const,
  language: "fr" as const,
  group: "launch",
  title: "Overpass ouvre ses portes",
  summary: "Ce que la plateforme propose le jour du lancement.",
  publishedAt: new Date("2026-10-23T00:00:00.000Z"),
  content: "Le texte de l'article.",
};
const launchEn = {
  ...launchFr,
  language: "en" as const,
  title: "Overpass opens its doors",
  summary: "What the platform offers on launch day.",
  content: "The article body.",
};

async function rows<Row>(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
  await ensureAdmin(db, {
    email: "team@example.com",
    password: "a long passphrase",
    country: "CI",
  });
  handle = (await rows<{ handle: string }>(sql`select handle from users`))[0]?.handle ?? "";
});
afterEach(() => close());

describe("seedPosts", () => {
  it("publishes each article once and links the two languages of a group", async () => {
    expect(await seedPosts(db, handle, [launchFr, launchEn], at)).toEqual({ created: 2 });
    expect(await seedPosts(db, handle, [launchFr, launchEn], at)).toEqual({ created: 0 });
    const posts = await rows<{ slug: string; status: string; group: string; published: string }>(
      sql`select slug, status, translation_group as "group", published_at::text as published
        from posts order by language`,
    );
    expect(posts.map((post) => post.slug)).toEqual([
      "overpass-opens-its-doors",
      "overpass-ouvre-ses-portes",
    ]);
    expect(posts.every((post) => post.status === "published")).toBe(true);
    expect(posts[0]?.group).toBe(posts[1]?.group);
    expect(posts[0]?.published.startsWith("2026-10-23")).toBe(true);
  });

  it("adds a missing translation to an article seeded earlier", async () => {
    await seedPosts(db, handle, [launchFr], at);
    expect(await seedPosts(db, handle, [launchFr, launchEn], at)).toEqual({ created: 1 });
    const groups = await rows<{ count: number }>(
      sql`select count(distinct translation_group)::int as count from posts`,
    );
    expect(groups[0]?.count).toBe(1);
  });

  it("ignores a member's post that happens to carry the same title", async () => {
    await db.execute(
      sql`insert into users (id, email, password_hash, handle, country)
        values ('00000000-0000-4000-8000-000000000002', 'm@b.co', 'h', 'member', 'CI')`,
    );
    await db.execute(
      sql`insert into posts (kind, author_id, language, slug, category, title, summary, content)
        values ('member', '00000000-0000-4000-8000-000000000002', 'fr', 'autre', 'tech-news',
          ${launchFr.title}, 'Un billet', 'Corps')`,
    );
    expect(await seedPosts(db, handle, [launchFr, launchEn], at)).toEqual({ created: 2 });
    const groups = await rows<{ count: number }>(
      sql`select count(distinct translation_group)::int as count from posts where kind = 'news'`,
    );
    expect(groups[0]?.count).toBe(1);
  });

  it("stores one cover for both languages of a group", async () => {
    const cover = samplePng;
    await seedPosts(
      db,
      handle,
      [
        { ...launchFr, cover },
        { ...launchEn, cover },
      ],
      at,
    );
    const covers = await rows<{ id: string | null }>(sql`select cover_media_id as id from posts`);
    expect(covers.every((post) => post.id !== null)).toBe(true);
    expect(new Set(covers.map((post) => post.id)).size).toBe(1);
  });

  it("adds a cover to an article seeded without one, never replacing one", async () => {
    const coverOf = async (language: string) =>
      (
        await rows<{ id: string | null }>(
          sql`select cover_media_id as id from posts where language = ${language}`,
        )
      )[0]?.id;
    await seedPosts(db, handle, [launchFr, launchEn], at);
    const seeded = await seedPosts(db, handle, [{ ...launchFr, cover: samplePng }], at);
    expect(seeded).toEqual({ created: 0 });
    const first = await coverOf("fr");
    expect(first).not.toBeNull();
    await seedPosts(db, handle, [{ ...launchFr, cover: sampleJpeg }], at);
    expect(await coverOf("fr")).toBe(first);
    expect(await coverOf("en")).toBeNull();
  });

  it("publishes a member's story with its stars and comments, once", async () => {
    const seeds = ["aminata-codes", "yao-dev", "kofi-builds"].map((name) => ({
      handle: name,
      country: "SN",
      language: "fr" as const,
      stacks: [],
      joinedAt: at,
    }));
    const authors = (await seedMembers(db, seeds)).ids;
    const story = {
      ...launchFr,
      kind: "member" as const,
      category: "portraits" as const,
      group: "salons",
      title: "Je vous présente mon SaaS pour les salons",
      author: "aminata-codes",
      stars: ["yao-dev", "kofi-builds"],
      comments: [
        { author: "yao-dev", at: new Date("2026-10-24T12:00:00.000Z"), content: "Bravo !" },
      ],
    };
    expect(await seedPosts(db, handle, [story], at, authors)).toEqual({ created: 1 });
    expect(await seedPosts(db, handle, [story], at, authors)).toEqual({ created: 0 });
    const [post] = await rows<{ kind: string; author: string; stars: number; comments: number }>(
      sql`select p.kind, u.handle as author, p.star_count as stars, p.comment_count as comments
        from posts p join users u on u.id = p.author_id`,
    );
    expect(post).toEqual({ kind: "member", author: "aminata-codes", stars: 2, comments: 1 });
  });

  it("refuses a handle that is not an admin", async () => {
    await expect(seedPosts(db, "someone", [launchFr], at)).rejects.toThrow("admin");
  });
});
