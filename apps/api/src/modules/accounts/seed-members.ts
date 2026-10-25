import type { Language } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";

export type MemberSeed = {
  handle: string;
  country: string;
  language: Language;
  stacks: readonly string[];
  joinedAt: Date;
};

/** Not an Argon2 hash, so every password check fails and nobody can sign in as a seeded member. */
const lockedPassword = "!";
/** RFC 2606 reserves .invalid: no mail sent to these addresses can ever reach a real person. */
const mailDomain = "members.invalid";

async function rows<Row>(db: Database, query: ReturnType<typeof sql>): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

async function insertMember(db: Database, seed: MemberSeed): Promise<boolean> {
  const at = seed.joinedAt.toISOString();
  const [created] = await rows<{ id: string }>(
    db,
    sql`insert into users (email, password_hash, handle, country, language, created_at, updated_at)
      values (${`${seed.handle}@${mailDomain}`}, ${lockedPassword}, ${seed.handle}, ${seed.country},
        ${seed.language}, ${at}, ${at})
      on conflict (handle) do nothing returning id`,
  );
  if (created === undefined) {
    await db.execute(
      sql`update users set created_at = ${at}, updated_at = ${at}
        where handle = ${seed.handle} and password_hash = ${lockedPassword} and created_at <> ${at}`,
    );
    return false;
  }
  for (const stack of seed.stacks) {
    await db.execute(
      sql`insert into user_stacks (user_id, stack) values (${created.id}, ${stack})`,
    );
  }
  return true;
}

/** A handle a real person registered must never receive the fictional content. */
async function refuseRealAccounts(db: Database, seeds: readonly MemberSeed[]): Promise<void> {
  for (const seed of seeds) {
    const [taken] = await rows<{ handle: string }>(
      db,
      sql`select handle from users where handle = ${seed.handle}
        and not (password_hash = ${lockedPassword} and email = ${`${seed.handle}@${mailDomain}`})`,
    );
    if (taken !== undefined)
      throw new Error(`the handle ${taken.handle} belongs to a real account`);
  }
}

/** Creates the fictional members once, then returns the id of every one of them by handle. */
export async function seedMembers(
  db: Database,
  seeds: readonly MemberSeed[],
): Promise<{ created: number; ids: Map<string, string> }> {
  await refuseRealAccounts(db, seeds);
  let created = 0;
  for (const seed of seeds) {
    if (await insertMember(db, seed)) created += 1;
  }
  const ids = new Map<string, string>();
  for (const seed of seeds) {
    const [row] = await rows<{ id: string }>(
      db,
      sql`select id from users where handle = ${seed.handle}`,
    );
    if (row !== undefined) ids.set(seed.handle, row.id);
  }
  return { created, ids };
}
