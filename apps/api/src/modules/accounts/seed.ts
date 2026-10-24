import { randomBytes } from "node:crypto";
import { registerInput } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { hashPassword } from "./passwords.js";
import { createAccountsRepository } from "./repository.js";

export type AdminSeed = { email: string; password?: string | undefined; country: string };
export type AdminSeedResult = "created" | "promoted" | "unchanged";

/** The id behind an admin handle, for seeds that attribute content to the team. */
export async function adminIdByHandle(db: Database, handle: string): Promise<string> {
  const result: unknown = await db.execute(
    sql`select id from users where handle = ${handle} and role = 'admin'`,
  );
  const [row] = (result as { rows: { id: string }[] }).rows;
  if (row === undefined) throw new Error(`no admin account with the handle ${handle}`);
  return row.id;
}

/** Creates the team account as admin, or promotes it; a password is only needed to create it. */
export async function ensureAdmin(db: Database, seed: AdminSeed): Promise<AdminSeedResult> {
  const repository = createAccountsRepository(db);
  const existing = await repository.findUserByEmail(registerInput.shape.email.parse(seed.email));
  if (existing?.role === "admin") return "unchanged";
  if (existing !== null) {
    await db.execute(sql`update users set role = 'admin' where id = ${existing.id}`);
    return "promoted";
  }
  if (seed.password === undefined) {
    throw new Error("no account with this email yet: set SEED_ADMIN_PASSWORD to create it");
  }
  const input = registerInput.parse({ ...seed, password: seed.password });
  const created = await repository.createUser({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    handle: `team-${randomBytes(3).toString("hex")}`,
    country: input.country,
    language: "fr",
  });
  await db.execute(sql`update users set role = 'admin' where id = ${created.id}`);
  return "created";
}
