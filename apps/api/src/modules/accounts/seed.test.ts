import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { createTestDatabase } from "../../db/testing.js";
import { verifyPassword } from "./passwords.js";
import { ensureAdmin } from "./seed.js";

let db: Database;
let close: () => Promise<void>;
const admin = { email: "team@example.com", password: "a long enough passphrase", country: "CI" };

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
});
afterEach(() => close());

async function account(email: string) {
  const result: unknown = await db.execute(
    sql`select role, password_hash, handle from users where email = ${email}`,
  );
  return (result as { rows: { role: string; password_hash: string }[] }).rows[0];
}

describe("ensureAdmin", () => {
  it("creates the admin account with a hashed password", async () => {
    expect(await ensureAdmin(db, admin)).toBe("created");
    const row = await account(admin.email);
    expect(row?.role).toBe("admin");
    expect(row?.password_hash).not.toContain(admin.password);
    expect(await verifyPassword(row?.password_hash ?? "", admin.password)).toBe(true);
  });

  it("promotes an account that already exists and keeps its password", async () => {
    await ensureAdmin(db, admin);
    await db.execute(sql`update users set role = 'member' where email = ${admin.email}`);
    expect(await ensureAdmin(db, { ...admin, password: "another long passphrase" })).toBe(
      "promoted",
    );
    const row = await account(admin.email);
    expect(row?.role).toBe("admin");
    expect(await verifyPassword(row?.password_hash ?? "", admin.password)).toBe(true);
  });

  it("changes nothing when run again", async () => {
    await ensureAdmin(db, admin);
    expect(await ensureAdmin(db, admin)).toBe("unchanged");
  });

  it("refuses a password the sign-up form would refuse", async () => {
    await expect(ensureAdmin(db, { ...admin, password: "short" })).rejects.toThrow();
    expect(await account(admin.email)).toBeUndefined();
  });
});
