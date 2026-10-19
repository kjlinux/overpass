import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { promoteAdmin } from "../../testing-discussions.js";
import { feedSlugs } from "../../testing-blog.js";
import { testClock } from "../../testing-routes.js";
import { createTestApp, handleOf, registerAccount } from "../../testing.js";
import { seedNewsTemplates } from "./index.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let admin: string;

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  const cookie = await registerAccount(app, "admin@example.com");
  await promoteAdmin(db, "admin@example.com");
  admin = await handleOf(app, cookie);
});
afterEach(() => close());

const drafts = async () => {
  const result: unknown = await db.execute(
    sql`select kind, status, language, category from posts order by category, language`,
  );
  return (
    result as { rows: { kind: string; status: string; language: string; category: string }[] }
  ).rows;
};

describe("news templates", () => {
  it("creates one news draft per category, in French and English, once", async () => {
    expect(await seedNewsTemplates(db, admin, new Date())).toEqual({ created: 6 });
    expect(await seedNewsTemplates(db, admin, new Date())).toEqual({ created: 0 });
    const rows = await drafts();
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.kind === "news" && row.status === "draft")).toBe(true);
    expect(rows.map((row) => `${row.category}:${row.language}`)).toEqual([
      "portraits:en",
      "portraits:fr",
      "tech-news:en",
      "tech-news:fr",
      "tutorials:en",
      "tutorials:fr",
    ]);
    expect(await feedSlugs(app)).toEqual([]);
  });

  it("refuses an account that is not an admin", async () => {
    const member = await handleOf(app, await registerAccount(app, "member@example.com"));
    await expect(seedNewsTemplates(db, member, new Date())).rejects.toThrow("admin");
  });
});
