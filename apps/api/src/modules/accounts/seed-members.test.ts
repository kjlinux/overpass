import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { createTestDatabase } from "../../db/testing.js";
import { verifyPassword } from "./passwords.js";
import { seedMembers } from "./seed-members.js";

let db: Database;
let close: () => Promise<void>;

const yao = {
  handle: "yao-dev",
  country: "CI",
  language: "fr" as const,
  stacks: ["laravel", "vue"],
  joinedAt: new Date("2026-10-23T08:30:00.000Z"),
};

async function rows<Row>(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
});
afterEach(() => close());

describe("seedMembers", () => {
  it("creates each member once and returns every id by handle", async () => {
    const first = await seedMembers(db, [yao]);
    expect(first.created).toBe(1);
    const second = await seedMembers(db, [yao]);
    expect(second).toEqual({ created: 0, ids: first.ids });
    const [user] = await rows<{ id: string; country: string; created: string; consent: null }>(
      sql`select id, country, created_at::text as created, newsletter_consent_at as consent
        from users where handle = 'yao-dev'`,
    );
    expect(first.ids.get("yao-dev")).toBe(user?.id);
    expect(user).toMatchObject({ country: "CI", consent: null });
    expect(user?.created.startsWith("2026-10-23 08:30")).toBe(true);
    const stacks = await rows<{ stack: string }>(sql`select stack from user_stacks order by stack`);
    expect(stacks.map((row) => row.stack)).toEqual(["laravel", "vue"]);
  });

  it("refuses a handle a real person already uses, before writing anything", async () => {
    await db.execute(
      sql`insert into users (email, password_hash, handle, country)
        values ('real@person.example', 'argon-hash', 'yao-dev', 'CI')`,
    );
    const awa = { ...yao, handle: "awa-kone" };
    await expect(seedMembers(db, [awa, yao])).rejects.toThrow("yao-dev");
    expect(await rows(sql`select 1 from users where handle = 'awa-kone'`)).toEqual([]);
  });

  it("gives an address that can receive no mail and a password nobody can match", async () => {
    await seedMembers(db, [yao]);
    const [user] = await rows<{ email: string; hash: string }>(
      sql`select email, password_hash as hash from users`,
    );
    expect(user?.email).toBe("yao-dev@members.invalid");
    expect(await verifyPassword(user?.hash ?? "", "")).toBe(false);
    expect(await verifyPassword(user?.hash ?? "", "yao-dev")).toBe(false);
  });
});
