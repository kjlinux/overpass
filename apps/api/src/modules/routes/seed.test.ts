import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { createTestDatabase } from "../../db/testing.js";
import { ensureAdmin } from "../accounts/index.js";
import { updateRoute } from "./repository/write.js";
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
  handle = (await rows<{ handle: string }>(sql`select handle from users`))[0]?.handle ?? "";
});
afterEach(() => close());

describe("seedRoutes", () => {
  it("creates each itinerary once, with its first version, for the admin account", async () => {
    expect(await seedRoutes(db, handle, [wave], at)).toEqual({ created: 1, updated: 0 });
    expect(await seedRoutes(db, handle, [wave], at)).toEqual({ created: 0, updated: 0 });
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
    expect(result).toEqual({ created: 1, updated: 0 });
  });

  it("brings a team itinerary nobody edited up to the corrected text, as version 2", async () => {
    await seedRoutes(db, handle, [wave], at);
    const fixed = { ...wave, content: `${wave.content}\n\nExcluez le webhook du contrôle CSRF.` };
    expect(await seedRoutes(db, handle, [fixed], at)).toEqual({ created: 0, updated: 1 });
    const [route] = await rows<{ content: string; version: number }>(
      sql`select content, version from routes`,
    );
    expect(route).toEqual({ content: fixed.content, version: 2 });
    expect(await rows(sql`select 1 from route_versions`)).toHaveLength(2);
  });

  it("writes nothing when a member edits between the seed's read and its update", async () => {
    await seedRoutes(db, handle, [wave], at);
    const [route] = await rows<{ id: string; author_id: string }>(
      sql`select id, author_id from routes`,
    );
    await db.execute(sql`update routes set version = 2, content = 'Texte d''un membre.'`);
    const patch = { content: "Contenu de l'équipe." };
    const written = await updateRoute(db, route?.id ?? "", patch, route?.author_id ?? "", at, 1);
    expect(written).toBe(false);
    const [kept] = await rows<{ content: string }>(sql`select content from routes`);
    expect(kept?.content).toBe("Texte d'un membre.");
  });

  it("leaves an itinerary someone already edited as it is", async () => {
    await seedRoutes(db, handle, [wave], at);
    await db.execute(sql`update routes set version = 2, content = 'Texte d''un membre.'`);
    const fixed = { ...wave, content: "Contenu corrigé par l'équipe." };
    expect(await seedRoutes(db, handle, [fixed], at)).toEqual({ created: 0, updated: 0 });
    const [route] = await rows<{ content: string }>(sql`select content from routes`);
    expect(route?.content).toBe("Texte d'un membre.");
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
