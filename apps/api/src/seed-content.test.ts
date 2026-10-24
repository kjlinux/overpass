import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "./db/client.js";
import { createTestDatabase } from "./db/testing.js";
import { ensureAdmin } from "./modules/accounts/index.js";
import { seedContent } from "./seed-content.js";

let db: Database;
let close: () => Promise<void>;
let dir: string;
let handle: string;
const now = () => new Date("2026-10-23T10:00:00.000Z");

const route = [
  "---",
  'title: "Encaisser un paiement Wave Checkout depuis Laravel"',
  "service: wave",
  "country: CI",
  "stack: laravel",
  "language: fr",
  "---",
  "Corps de la fiche.",
].join("\n");
const thread = [
  "---",
  'title: "Bienvenue sur Intégrations et API"',
  "topic: integrations",
  "language: fr",
  "---",
  "Corps.",
].join("\n");
const post = [
  "---",
  'title: "Overpass ouvre ses portes"',
  "kind: news",
  "category: tech-news",
  "language: fr",
  "group: launch",
  'summary: "Le résumé."',
  "publishedAt: 2026-10-23",
  "---",
  "Corps.",
].join("\n");

function write(path: string, text: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
}

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
  dir = mkdtempSync(join(tmpdir(), "overpass-seed-"));
  write("routes/01-wave-ci-laravel.md", route);
  write("threads/fr/01-integrations.md", thread);
  write("posts/fr/01-launch.md", post);
});
afterEach(async () => {
  rmSync(dir, { recursive: true, force: true });
  await close();
});

describe("seedContent", () => {
  it("seeds the three kinds of content once and recomputes the team's points", async () => {
    expect(await seedContent(db, handle, dir, now)).toEqual({ routes: 1, threads: 1, posts: 1 });
    expect(await seedContent(db, handle, dir, now)).toEqual({ routes: 0, threads: 0, posts: 0 });
    const [points] = await rows<{ points: number }>(
      sql`select points from member_points p join users u on u.id = p.user_id
        where u.handle = ${handle}`,
    );
    expect(points?.points).toBeGreaterThan(0);
  });

  it("stops before writing anything when a file is invalid", async () => {
    write("routes/02-bad.md", route.replace("stack: laravel", "stack: cobol"));
    await expect(seedContent(db, handle, dir, now)).rejects.toThrow("02-bad.md");
    expect(await rows(sql`select 1 from routes`)).toEqual([]);
  });
});
