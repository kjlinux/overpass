import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

let pg: PGlite;
let executor: SqlExecutor;
const ada = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";

async function insertPost(language: string, slug: string, group?: string): Promise<string> {
  const [row] = await executor.query<{ id: string }>(
    `insert into posts (kind, author_id, language, slug, category, title, summary, content, translation_group)
     values ('member', $1, $2, $3, 'tutorials', 'Un article de test', 'Résumé', 'Texte', coalesce($4::uuid, gen_random_uuid()))
     returning id`,
    [ada, language, slug, group ?? null],
  );
  return row?.id ?? "";
}

async function rejects(sql: string, params: unknown[] = []): Promise<boolean> {
  return executor.query(sql, params).then(
    () => false,
    () => true,
  );
}

beforeEach(async () => {
  pg = new PGlite();
  executor = pgliteExecutor(pg);
  await migrateUp(executor, migrationsDirectory);
  await executor.query(
    `insert into users (id, email, password_hash, handle, country) values
     ($1, 'a@b.co', 'h', 'dev-a', 'CI'), ($2, 'b@b.co', 'h', 'dev-b', 'SN')`,
    [ada, bob],
  );
});
afterEach(() => pg.close());

describe("blog migration", () => {
  it("keeps one slug per language and one post per language in a translation group", async () => {
    const first = await insertPost("fr", "wave-laravel");
    const duplicate = insertPost("fr", "wave-laravel");
    expect(
      await duplicate.then(
        () => false,
        () => true,
      ),
    ).toBe(true);
    await insertPost("en", "wave-laravel");
    const [group] = await executor.query<{ g: string }>(
      "select translation_group as g from posts where id = $1",
      [first],
    );
    expect(
      await rejects(
        `insert into posts (kind, author_id, language, slug, category, title, summary, content, translation_group)
         values ('member', $1, 'fr', 'autre', 'tutorials', 'Un article de test', 'R', 'T', $2)`,
        [ada, group?.g],
      ),
    ).toBe(true);
  });

  it("refuses a published post without a publication date", async () => {
    const id = await insertPost("fr", "brouillon");
    expect(await rejects("update posts set status = 'published' where id = $1", [id])).toBe(true);
  });

  it("allows one star per account and no self-follow", async () => {
    const id = await insertPost("fr", "etoile");
    await executor.query("insert into post_stars (post_id, user_id) values ($1, $2)", [id, bob]);
    expect(
      await rejects("insert into post_stars (post_id, user_id) values ($1, $2)", [id, bob]),
    ).toBe(true);
    await executor.query("insert into follows (follower_id, followee_id) values ($1, $2)", [
      bob,
      ada,
    ]);
    expect(
      await rejects("insert into follows (follower_id, followee_id) values ($1, $1)", [ada]),
    ).toBe(true);
  });

  it("removes the stars, comments, follows and suspension of a deleted account", async () => {
    const id = await insertPost("fr", "suppression");
    await executor.query("insert into post_stars (post_id, user_id) values ($1, $2)", [id, bob]);
    await executor.query(
      "insert into post_comments (post_id, author_id, content) values ($1, $2, 'Merci')",
      [id, bob],
    );
    await executor.query("insert into follows (follower_id, followee_id) values ($1, $2)", [
      bob,
      ada,
    ]);
    await executor.query("insert into blog_suspensions (user_id) values ($1)", [bob]);
    await executor.query("delete from users where id = $1", [bob]);
    for (const table of ["post_stars", "post_comments", "follows", "blog_suspensions"]) {
      expect(await executor.query(`select * from ${table}`)).toEqual([]);
    }
  });

  it("adds the stars received to the points cache", async () => {
    const columns = await executor.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'member_points' and column_name = 'stars'",
    );
    expect(columns).toHaveLength(1);
  });
});

describe("newsletter migration", () => {
  it("keeps one row per address and one delivery per subscriber and issue", async () => {
    const [subscriber] = await executor.query<{ id: string }>(
      "insert into newsletter_subscribers (email, language) values ('ada@example.com', 'fr') returning id",
    );
    expect(
      await rejects(
        "insert into newsletter_subscribers (email, language) values ('ada@example.com', 'en')",
      ),
    ).toBe(true);
    const [issue] = await executor.query<{ id: string }>(
      "insert into newsletter_issues (number, language, subject) values (1, 'fr', 'Semaine 42') returning id",
    );
    const delivery = "insert into newsletter_deliveries (issue_id, subscriber_id) values ($1, $2)";
    await executor.query(delivery, [issue?.id, subscriber?.id]);
    expect(await rejects(delivery, [issue?.id, subscriber?.id])).toBe(true);
  });
});
