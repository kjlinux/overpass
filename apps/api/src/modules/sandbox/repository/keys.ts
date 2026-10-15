import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { sandboxDeliveries, sandboxKeys } from "../tables.js";

export type KeyRow = typeof sandboxKeys.$inferSelect;
export type KeyInsert = typeof sandboxKeys.$inferInsert;
export type KeyPatch = Partial<Pick<KeyRow, "scenario" | "target" | "webhookUrl">>;

const active = (now: Date) => and(isNull(sandboxKeys.revokedAt), gt(sandboxKeys.expiresAt, now));

function keyReads(db: Database) {
  const first = async (where: ReturnType<typeof and>) =>
    (await db.select().from(sandboxKeys).where(where))[0];
  return {
    async countActive(userId: string, now: Date): Promise<number> {
      const [row] = await db
        .select({ total: count() })
        .from(sandboxKeys)
        .where(and(eq(sandboxKeys.userId, userId), active(now)));
      return row?.total ?? 0;
    },
    listActive: (userId: string, now: Date) =>
      db
        .select()
        .from(sandboxKeys)
        .where(and(eq(sandboxKeys.userId, userId), active(now)))
        .orderBy(desc(sandboxKeys.createdAt)),
    findOwned: (userId: string, id: string, now: Date): Promise<KeyRow | undefined> =>
      first(and(eq(sandboxKeys.id, id), eq(sandboxKeys.userId, userId), active(now))),
    async findByDelivery(
      userId: string,
      deliveryId: string,
      now: Date,
    ): Promise<KeyRow | undefined> {
      const [row] = await db
        .select({ key: sandboxKeys })
        .from(sandboxDeliveries)
        .innerJoin(sandboxKeys, eq(sandboxKeys.id, sandboxDeliveries.keyId))
        .where(
          and(eq(sandboxDeliveries.id, deliveryId), eq(sandboxKeys.userId, userId), active(now)),
        );
      return row?.key;
    },
    findActiveByHash: (keyHash: string, now: Date): Promise<KeyRow | undefined> =>
      first(and(eq(sandboxKeys.keyHash, keyHash), active(now))),
  };
}

function keyWrites(db: Database) {
  return {
    async insert(values: KeyInsert): Promise<KeyRow> {
      const [row] = await db.insert(sandboxKeys).values(values).returning();
      if (row === undefined) throw new Error("sandbox key insert returned nothing");
      return row;
    },
    async update(id: string, patch: KeyPatch): Promise<KeyRow | undefined> {
      const [row] = await db
        .update(sandboxKeys)
        .set(patch)
        .where(eq(sandboxKeys.id, id))
        .returning();
      return row;
    },
    async revoke(id: string, now: Date): Promise<void> {
      await db.update(sandboxKeys).set({ revokedAt: now }).where(eq(sandboxKeys.id, id));
    },
  };
}

/** Test keys: looked up by digest only, owned by one account or by the public demo. */
export function keysRepository(db: Database) {
  return { ...keyReads(db), ...keyWrites(db) };
}

export type KeysRepository = ReturnType<typeof keysRepository>;
