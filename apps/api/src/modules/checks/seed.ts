import { sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";

export type CheckSeed = { handle: string; country: string; joinedAt: Date; checks: number };

const hour = 60 * 60 * 1000;

/** A small deterministic generator, so a rerun spreads a member's checks the same way. */
function generator(text: string): () => number {
  let state = 0;
  for (const char of text) state = (Math.imul(state, 31) + char.charCodeAt(0)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

async function column<Row>(db: Database, query: ReturnType<typeof sql>): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

/** Dates between the join and the run, thinner at the start as members settle in. */
function datesFor(seed: CheckSeed, count: number, now: Date): Date[] {
  const random = generator(seed.handle);
  const from = seed.joinedAt.getTime() + 2 * hour;
  const span = Math.max(now.getTime() - 2 * hour - from, hour);
  const dates = Array.from({ length: count }, () => new Date(from + random() ** 0.8 * span));
  return dates.sort((left, right) => left.getTime() - right.getTime());
}

/** Gives each member the verifications the content says they made, never more than the target. */
export async function seedChecks(
  db: Database,
  seeds: readonly CheckSeed[],
  ids: ReadonlyMap<string, string>,
  now: Date,
): Promise<{ created: number }> {
  const routes = await column<{ id: string }>(
    db,
    sql`select id from routes where deleted_at is null order by id`,
  );
  if (routes.length === 0) return { created: 0 };
  let created = 0;
  for (const seed of seeds) {
    const userId = ids.get(seed.handle);
    if (userId === undefined || seed.checks === 0) continue;
    const [have] = await column<{ n: number }>(
      db,
      sql`select count(*)::int as n from checks where user_id = ${userId}`,
    );
    const missing = seed.checks - (have?.n ?? 0);
    if (missing <= 0) continue;
    const random = generator(`${seed.handle}:routes`);
    for (const when of datesFor(seed, missing, now)) {
      const route = routes[Math.floor(random() * routes.length)];
      const environment = random() < 0.65 ? "production" : "test";
      await db.execute(
        sql`insert into checks (route_id, user_id, country, environment, checked_at)
          values (${route?.id}, ${userId}, ${seed.country}, ${environment}, ${when.toISOString()})`,
      );
      created += 1;
    }
  }
  return { created };
}
