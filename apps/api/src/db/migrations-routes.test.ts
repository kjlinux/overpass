import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

let pg: PGlite;
let executor: SqlExecutor;
const userId = "00000000-0000-4000-8000-000000000001";

async function insertRoute(language: string, title: string, content: string): Promise<string> {
  const [row] = await executor.query<{ id: string }>(
    `insert into routes (author_id, service_id, country, stack, language, title, content)
     select $1, id, 'CI', 'laravel', $2, $3, $4 from services where slug = 'wave' returning id`,
    [userId, language, title, content],
  );
  return row?.id ?? "";
}

beforeEach(async () => {
  pg = new PGlite();
  executor = pgliteExecutor(pg);
  await migrateUp(executor, migrationsDirectory);
  await executor.query(
    `insert into users (id, email, password_hash, handle, country) values ($1, 'a@b.co', 'h', 'dev-a', 'CI')`,
    [userId],
  );
});
afterEach(() => pg.close());

describe("routes and checks migrations", () => {
  it("seeds the six services of the specification, four of them simulated", async () => {
    const rows = await executor.query<{ slug: string; simulated: boolean }>(
      "select slug, simulated from services order by slug",
    );
    expect(rows.map((row) => row.slug)).toEqual([
      "cinetpay",
      "moov-money",
      "orange-money",
      "paydunya",
      "pi-spi",
      "wave",
    ]);
    expect(rows.filter((row) => row.simulated)).toHaveLength(4);
  });

  it("keeps every candidate country unconfirmed, each with its source", async () => {
    const rows = await executor.query<{ confirmed: boolean; source: string }>(
      "select confirmed, source from service_countries",
    );
    expect(rows.length).toBeGreaterThan(30);
    expect(rows.filter((row) => row.confirmed)).toEqual([]);
    expect(rows.every((row) => row.source.startsWith("https://"))).toBe(true);
  });

  it("indexes French itineraries with French stemming", async () => {
    await insertRoute("fr", "Encaisser les paiements Wave", "Les webhooks signés arrivent.");
    const rows = await executor.query(
      "select id from routes where search @@ websearch_to_tsquery('french', 'paiement webhook')",
    );
    expect(rows).toHaveLength(1);
  });

  it("indexes English itineraries with English stemming", async () => {
    await insertRoute("en", "Collect Wave payments", "Signed webhooks arrive late.");
    const rows = await executor.query(
      "select id from routes where search @@ websearch_to_tsquery('english', 'payment webhook')",
    );
    expect(rows).toHaveLength(1);
  });

  it("keeps the itineraries of a deleted account without author", async () => {
    const routeId = await insertRoute("fr", "Encaisser les paiements Wave", "Contenu.");
    await executor.query("delete from users");
    const [row] = await executor.query<{ author_id: string | null }>(
      "select author_id from routes where id = $1",
      [routeId],
    );
    expect(row?.author_id).toBeNull();
  });

  it("refuses a pothole status outside open, confirmed and resolved", async () => {
    const routeId = await insertRoute("fr", "Encaisser les paiements Wave", "Contenu.");
    await expect(
      executor.query(
        "insert into potholes (route_id, user_id, description, status) values ($1, $2, 'Un piège réel', 'closed')",
        [routeId, userId],
      ),
    ).rejects.toThrow();
  });
});
