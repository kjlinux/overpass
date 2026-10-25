import { readdirSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateDown, migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor, testPglite } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

let pg: PGlite;
let executor: SqlExecutor;
const ada = "00000000-0000-4000-8000-000000000001";

beforeEach(async () => {
  pg = await testPglite();
  executor = pgliteExecutor(pg);
  await migrateUp(executor, migrationsDirectory);
  await executor.query(
    "insert into users (id, email, password_hash, handle, country) values ($1, 'a@b.co', 'h', 'dev-a', 'CI')",
    [ada],
  );
});
afterEach(() => pg.close());

async function postMatches(language: string, title: string, query: string): Promise<boolean> {
  await executor.query("delete from posts");
  await executor.query(
    `insert into posts (kind, author_id, language, slug, category, title, summary, content)
     values ('member', $1, $2, 'test', 'tutorials', $3, 'Résumé court', 'Texte du corps')`,
    [ada, language, title],
  );
  const [row] = await executor.query<{ hit: boolean }>(
    `select search @@ (websearch_to_tsquery('overpass_french', $1)
      || websearch_to_tsquery('overpass_english', $1)) as hit from posts`,
    [query],
  );
  return row?.hit === true;
}

describe("search migration", () => {
  it("matches word forms and ignores accents, in French and in English", async () => {
    expect(await postMatches("fr", "Les paiements par réseau mobile", "paiement reseau")).toBe(
      true,
    );
    expect(await postMatches("en", "Collecting mobile payments", "payment")).toBe(true);
    expect(await postMatches("fr", "Un article sans rapport", "payment")).toBe(false);
  });

  it("indexes threads, replies and routes, and finds titles despite a typo", async () => {
    const columns = await executor.query<{ table_name: string }>(
      `select table_name from information_schema.columns
       where column_name = 'search' order by table_name`,
    );
    expect(columns.map((row) => row.table_name)).toEqual(["posts", "replies", "routes", "threads"]);
    const [row] = await executor.query<{ score: number }>(
      "select word_similarity('webhok', lower('Recevoir un webhook signé')) as score",
    );
    expect(row?.score).toBeGreaterThan(0.4);
  });

  it("rolls back to the previous schema", async () => {
    // Steps back to 0021 whatever migrations come after this one.
    const since = readdirSync(migrationsDirectory).filter(
      (name) => /^[0-9]{4}_[a-z0-9_]+[.]up[.]sql$/.test(name) && name >= "0022",
    );
    await migrateDown(executor, migrationsDirectory, since.length);
    const columns = await executor.query<{ table_name: string }>(
      "select table_name from information_schema.columns where column_name = 'search'",
    );
    expect(columns.map((row) => row.table_name)).toEqual(["routes"]);
  });
});
