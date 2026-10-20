import { randomBytes } from "node:crypto";
import { registerInput } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { hashPassword } from "./passwords.js";
import { createAccountsRepository } from "./repository.js";

export type AdminSeed = { email: string; password: string; country: string };
export type AdminSeedResult = "created" | "promoted" | "unchanged";

/** Creates the team account as admin, or promotes it; an existing password is never replaced. */
export async function ensureAdmin(db: Database, seed: AdminSeed): Promise<AdminSeedResult> {
  const input = registerInput.parse(seed);
  const repository = createAccountsRepository(db);
  const existing = await repository.findUserByEmail(input.email);
  if (existing?.role === "admin") return "unchanged";
  if (existing !== null) {
    await db.execute(sql`update users set role = 'admin' where id = ${existing.id}`);
    return "promoted";
  }
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
