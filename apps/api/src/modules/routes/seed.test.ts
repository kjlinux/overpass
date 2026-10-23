import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { createTestDatabase } from "../../db/testing.js";
import { ensureAdmin } from "../accounts/index.js";
import { seedRoutes } from "./seed.js";

let db: Database;
let close: () => Promise<void>;
let handle: string;
const at = new Date("2026-10-23T10:00:00.000Z");

const wave = {
  service: "wave",
  country: "CI",
  stack: "laravel",
  language: "fr" as const,
  title: "Encaisser un paiement Wave Checkout depuis Laravel",
  content: "## Prérequis\n\nUn compte marchand.",
};

async function rows<Row>(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
  await ensureAdmin(db, {
    email: "team@example.com",
    password: "a long passphrase",
    country: "CI",
  });
  [{ handle }] = await rows<{ handle: string }>(sql`select handle from users`);
});
afterEach(() => close());

describe("seedRoutes", () => {
  it("creates each itinerary once, with its first version, for the admin account", async () => {
    expect(await seedRoutes(db, handle, [wave], at)).toEqual({ created: 1 });
    expect(await seedRoutes(db, handle, [wave], at)).toEqual({ created: 0 });
    const routes = await rows<{ title: string; version: number; stack: string }>(
      sql`select r.title, r.version, r.stack from routes r join users u on u.id = r.author_id
        where u.handle = ${handle}`,
    );
    expect(routes).toEqual([{ title: wave.title, version: 1, stack: "laravel" }]);
    expect(await rows(sql`select 1 from route_versions where number = 1`)).toHaveLength(1);
  });

  it("treats another stack of the same service and country as a new itinerary", async () => {
    await seedRoutes(db, handle, [wave], at);
    const result = await seedRoutes(db, handle, [{ ...wave, stack: "nodejs" }], at);
    expect(result).toEqual({ created: 1 });
  });

  it("names an unknown service instead of inserting", async () => {
    await expect(seedRoutes(db, handle, [{ ...wave, service: "nope" }], at)).rejects.toThrow(
      "nope",
    );
  });

  it("refuses a handle that is not an admin", async () => {
    await expect(seedRoutes(db, "someone", [wave], at)).rejects.toThrow("admin");
  });
});
