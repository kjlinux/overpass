import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateDown, migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

const admin = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const oldRoute =
  "Source : docs.wave.com. La piste d'essai Overpass rejoue cette API, signature comprise.";
const newRoute =
  "Source : docs.wave.com. Le Simulateur Overpass rejoue cette API, signature comprise.";
const oldTitle = "PI-SPI pas à pas sur la piste d'essai";
const newTitle = "PI-SPI pas à pas sur le Simulateur";
const stamp = "2026-10-20T08:00:00.000Z";

let pg: PGlite;
let executor: SqlExecutor;

async function migrateTo0021() {
  const after = readdirSync(migrationsDirectory).filter(
    (name) => /^[0-9]{4}_[a-z0-9_]+[.]up[.]sql$/.test(name) && name >= "0022",
  );
  await migrateDown(executor, migrationsDirectory, after.length);
}

async function insertContent() {
  await executor.query(
    `insert into users (id, email, password_hash, handle, country, role) values
     ($1, 'admin@b.co', 'h', 'admin-a', 'CI', 'admin'), ($2, 'member@b.co', 'h', 'dev-b', 'CI', 'member')`,
    [admin, member],
  );
  for (const [author, stack] of [
    [admin, "laravel"],
    [member, "nodejs"],
  ] as const) {
    await executor.query(
      `with route as (
         insert into routes (author_id, service_id, country, stack, language, title, content, updated_at)
         select $1, id, 'SN', $2, 'fr', 'Wave Checkout dans Laravel', $3, $4 from services where slug = 'wave'
         returning id)
       insert into route_versions (route_id, number, title, content, author_id)
       select id, 1, 'Wave Checkout dans Laravel', $3, $1 from route`,
      [author, stack, oldRoute, stamp],
    );
  }
  await executor.query(
    `insert into posts (kind, author_id, language, slug, category, title, summary, content)
     values ('news', $1, 'fr', 'pi-spi-guide', 'tutorials', $2, 'Résumé', 'Ouvrez la piste d''essai, choisissez PI-SPI.')`,
    [admin, oldTitle],
  );
}

const routeRows = () =>
  executor.query<{
    stack: string;
    content: string;
    version: number;
    updated: string;
    history: string;
  }>(
    `select r.stack, r.content, r.version, r.updated_at::text as updated, v.content as history
     from routes r join route_versions v on v.route_id = r.id and v.number = r.version order by r.stack`,
  );

beforeEach(async () => {
  pg = new PGlite();
  executor = pgliteExecutor(pg);
  await migrateUp(executor, migrationsDirectory);
  await migrateTo0021();
  await insertContent();
});
afterEach(() => pg.close());

describe("Simulator wording migration", () => {
  it("rewords admin routes and their current version without a new version", async () => {
    const before = await routeRows();
    await migrateUp(executor, migrationsDirectory);
    const [adminRoute, memberRoute] = await routeRows();
    expect(adminRoute).toMatchObject({
      stack: "laravel",
      content: newRoute,
      history: newRoute,
      version: 1,
    });
    expect(adminRoute?.updated).toBe(before[0]?.updated);
    expect(memberRoute).toMatchObject({ stack: "nodejs", content: oldRoute, history: oldRoute });
  });

  it("rewords the admin post title and body", async () => {
    await migrateUp(executor, migrationsDirectory);
    const [post] = await executor.query<{ title: string; content: string }>(
      "select title, content from posts",
    );
    expect(post).toEqual({ title: newTitle, content: "Ouvrez le Simulateur, choisissez PI-SPI." });
  });

  it("keeps the seed file title equal to the migrated one so the seed finds the post", () => {
    const file = fileURLToPath(
      new URL("../../content/posts/fr/02-pispi-guide.md", import.meta.url),
    );
    expect(readFileSync(file, "utf8")).toContain(`title: "${newTitle}"`);
  });

  it("restores the old wording on rollback", async () => {
    await migrateUp(executor, migrationsDirectory);
    await migrateTo0021();
    const [adminRoute] = await routeRows();
    const [post] = await executor.query<{ title: string }>("select title from posts");
    expect(adminRoute?.content).toBe(oldRoute);
    expect(adminRoute?.history).toBe(oldRoute);
    expect(post?.title).toBe(oldTitle);
  });
});
