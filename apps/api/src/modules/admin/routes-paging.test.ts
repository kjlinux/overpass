import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { registerAdmin } from "../../testing-admin.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let admin: string;

/** Production clocks keep microseconds; PGlite's now() stops at milliseconds, so set them. */
const sameInstant = "2026-10-16 12:00:00.123456+00";

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({ now: testClock().now }));
  admin = await registerAdmin(app, db, "admin@example.com");
});
afterEach(() => close());

/** Every page of a list, following `next` until the end. */
async function allIds(url: string): Promise<string[]> {
  const ids: string[] = [];
  let next: string | null = null;
  do {
    const query: string = next === null ? "" : `?cursor=${next}`;
    const { body } = await call(app, "GET", `${url}${query}`, { cookie: admin });
    const page = body.data as { items: { id: string }[]; next: string | null };
    ids.push(...page.items.map((item) => item.id));
    next = page.next;
  } while (next !== null);
  return ids;
}

describe("admin cursors on rows written in the same transaction", () => {
  it("list every account once", async () => {
    await db.execute(sql`insert into users (email, password_hash, handle, country, created_at)
      select 'u' || n || '@example.com', 'h', 'user-' || n, 'CI', ${sameInstant}::timestamptz
      from generate_series(1, 120) n`);
    const ids = await allIds("/v1/admin/accounts");
    expect(ids).toHaveLength(121);
    expect(new Set(ids).size).toBe(121);
  });

  it("list every log entry once", async () => {
    await db.execute(sql`insert into moderation_actions (target_kind, target_id, action, created_at)
      select 'route', gen_random_uuid(), 'hide', ${sameInstant}::timestamptz
      from generate_series(1, 120)`);
    const ids = await allIds("/v1/admin/log");
    expect(ids).toHaveLength(120);
    expect(new Set(ids).size).toBe(120);
  });

  it("list every reported itinerary once", async () => {
    await db.execute(sql`insert into routes (author_id, service_id, country, stack, language,
        title, content)
      select null, s.id, 'CI', 'laravel', 'fr', 'Itinéraire numéro ' || n, 'x'
      from services s, generate_series(1, 120) n where s.slug = 'wave'`);
    await db.execute(sql`insert into route_reports (route_id, user_id, reason, created_at)
      select r.id, u.id, 'Lien mort', ${sameInstant}::timestamptz from routes r, users u`);
    const ids = await allIds("/v1/admin/queue");
    expect(ids).toHaveLength(120);
    expect(new Set(ids).size).toBe(120);
  });
});
