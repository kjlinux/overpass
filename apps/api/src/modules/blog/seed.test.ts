import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { createTestDatabase } from "../../db/testing.js";
import { ensureAdmin } from "../accounts/index.js";
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
  [{ handle }] = await rows<{ handle: string }>(sql`select handle from users`);
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

  it("refuses a handle that is not an admin", async () => {
    await expect(seedPosts(db, "someone", [launchFr], at)).rejects.toThrow("admin");
  });
});
