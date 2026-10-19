import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateUp, migrationsDirectory } from "./migrations.js";
import { pgliteExecutor } from "./testing.js";
import type { SqlExecutor } from "./migrations.js";

let pg: PGlite;
let executor: SqlExecutor;
const actorId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";

beforeEach(async () => {
  pg = new PGlite();
  executor = pgliteExecutor(pg);
  await migrateUp(executor, migrationsDirectory);
  await executor.query(
    `insert into users (id, email, password_hash, handle, country) values ($1, 'a@b.co', 'h', 'dev-a', 'CI')`,
    [actorId],
  );
  await executor.query(
    `insert into moderation_actions (actor_id, target_kind, target_id, action) values ($1, 'route', $2, 'hide')`,
    [actorId, targetId],
  );
});
afterEach(() => pg.close());

describe("moderation_actions", () => {
  it("refuses any update of a decision", async () => {
    await expect(
      executor.query("update moderation_actions set action = 'restore'"),
    ).rejects.toThrow();
    await expect(
      executor.query("update moderation_actions set actor_id = null, reason = 'x'"),
    ).rejects.toThrow();
  });

  it("refuses to delete a decision", async () => {
    await expect(executor.query("delete from moderation_actions")).rejects.toThrow();
  });

  it("keeps the decision without actor when the actor account is deleted", async () => {
    await executor.query("delete from users where id = $1", [actorId]);
    const rows = await executor.query<{ actor_id: string | null; action: string }>(
      "select actor_id, action from moderation_actions",
    );
    expect(rows).toEqual([{ actor_id: null, action: "hide" }]);
  });
});
