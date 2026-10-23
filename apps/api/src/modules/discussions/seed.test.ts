import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { createTestDatabase } from "../../db/testing.js";
import { ensureAdmin } from "../accounts/index.js";
import { seedThreads } from "./seed.js";

let db: Database;
let close: () => Promise<void>;
let handle: string;
const at = new Date("2026-10-23T10:00:00.000Z");

const welcome = {
  topic: "integrations" as const,
  language: "fr" as const,
  title: "Bienvenue sur Intégrations et API",
  content: "Ici on branche un service et on le fait marcher.",
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

describe("seedThreads", () => {
  it("opens each welcome thread once, visible, dated and authored by the admin", async () => {
    expect(await seedThreads(db, handle, [welcome], at)).toEqual({ created: 1 });
    expect(await seedThreads(db, handle, [welcome], at)).toEqual({ created: 0 });
    const threads = await rows<{ topic: string; status: string; created: string }>(
      sql`select t.topic, t.status, t.created_at::text as created from threads t
        join users u on u.id = t.author_id where u.handle = ${handle}`,
    );
    expect(threads).toEqual([
      expect.objectContaining({ topic: "integrations", status: "visible" }),
    ]);
    expect(threads[0]?.created.startsWith("2026-10-23")).toBe(true);
  });

  it("keeps the same topic in another language as a separate thread", async () => {
    await seedThreads(db, handle, [welcome], at);
    const english = { ...welcome, language: "en" as const, title: "Welcome to Integrations" };
    expect(await seedThreads(db, handle, [english], at)).toEqual({ created: 1 });
  });

  it("refuses a handle that is not an admin", async () => {
    await expect(seedThreads(db, "someone", [welcome], at)).rejects.toThrow("admin");
  });
});
