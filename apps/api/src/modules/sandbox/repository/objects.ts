import type { ObjectStore } from "@overpass/simulator";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { sandboxObjects } from "../tables.js";

const listLimit = 500;

/** The simulator's object store, scoped so one key never reads another key's objects. */
export function objectStore(db: Database, keyId: string, provider: string): ObjectStore {
  const scope = (kind: string) =>
    and(
      eq(sandboxObjects.keyId, keyId),
      eq(sandboxObjects.provider, provider),
      eq(sandboxObjects.kind, kind),
    );
  return {
    async get(kind, id) {
      const [row] = await db
        .select({ body: sandboxObjects.body })
        .from(sandboxObjects)
        .where(and(scope(kind), eq(sandboxObjects.objectId, id)));
      return row?.body;
    },
    async put(kind, id, value) {
      await db
        .insert(sandboxObjects)
        .values({ keyId, provider, kind, objectId: id, body: value })
        .onConflictDoUpdate({
          target: [
            sandboxObjects.keyId,
            sandboxObjects.provider,
            sandboxObjects.kind,
            sandboxObjects.objectId,
          ],
          set: { body: value, updatedAt: sql`now()` },
        });
    },
    async list(kind) {
      const rows = await db
        .select({ body: sandboxObjects.body })
        .from(sandboxObjects)
        .where(scope(kind))
        .orderBy(asc(sandboxObjects.createdAt))
        .limit(listLimit);
      return rows.map((row) => row.body);
    },
  };
}
