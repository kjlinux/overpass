import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { createTestDatabase } from "../../db/testing.js";
import { ensureAdmin, seedMembers } from "../accounts/index.js";
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

/** Fictional members, created the way the content seed creates them. */
async function members(...handles: string[]): Promise<Map<string, string>> {
  const seeds = handles.map((name) => ({
    handle: name,
    country: "CI",
    language: "fr" as const,
    stacks: [],
    joinedAt: at,
  }));
  return (await seedMembers(db, seeds)).ids;
}

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

  it("opens a member's question with its replies, useful votes and accepted answer", async () => {
    const authors = await members("yao-dev", "serge-tech", "awa-kone");
    const question = {
      ...welcome,
      title: "Wave CI : le webhook ne revient jamais en local",
      author: "yao-dev",
      at: new Date("2026-10-24T08:00:00.000Z"),
      country: "CI",
      stack: "laravel",
      replies: [
        {
          author: "serge-tech",
          at: new Date("2026-10-24T09:12:00.000Z"),
          useful: ["yao-dev", "awa-kone"],
          accepted: true,
          content: "Vérifiez l'URL publique.",
        },
        {
          author: "yao-dev",
          at: new Date("2026-10-24T10:00:00.000Z"),
          useful: [],
          accepted: false,
          content: "Merci !",
        },
      ],
    };
    expect(await seedThreads(db, handle, [question], at, authors)).toEqual({ created: 1 });
    expect(await seedThreads(db, handle, [question], at, authors)).toEqual({ created: 0 });
    const [thread] = await rows<{ author: string; country: string; created: string; last: string }>(
      sql`select u.handle as author, t.country, t.created_at::text as created,
        t.last_activity_at::text as last from threads t join users u on u.id = t.author_id`,
    );
    expect(thread).toMatchObject({ author: "yao-dev", country: "CI" });
    expect(thread?.created.startsWith("2026-10-24 08:00")).toBe(true);
    expect(thread?.last.startsWith("2026-10-24 10:00")).toBe(true);
    const replies = await rows<{ author: string; useful: number; accepted: boolean }>(
      sql`select u.handle as author, r.useful_count as useful, t.accepted_reply_id = r.id as accepted
        from replies r join users u on u.id = r.author_id join threads t on t.id = r.thread_id
        order by r.created_at`,
    );
    expect(replies).toEqual([
      { author: "serge-tech", useful: 2, accepted: true },
      { author: "yao-dev", useful: 0, accepted: false },
    ]);
  });

  it("refuses an author it does not know", async () => {
    const stranger = { ...welcome, author: "nobody-here", replies: [] };
    await expect(seedThreads(db, handle, [stranger], at, new Map())).rejects.toThrow("nobody-here");
  });

  it("refuses a handle that is not an admin", async () => {
    await expect(seedThreads(db, "someone", [welcome], at)).rejects.toThrow("admin");
  });
});
