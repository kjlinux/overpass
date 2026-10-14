import { and, asc, eq, gt, gte, isNull } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { sandboxDeliveries, sandboxKeys } from "../tables.js";

export type RelayDelivery = typeof sandboxDeliveries.$inferSelect;
export type LocalResult = { status: number | null; durationMs: number; error?: string | undefined };

const table = sandboxDeliveries;
const replayWindowMs = 86_400_000;
const replayLimit = 100;

const isSuccess = (status: number | null) => status !== null && status >= 200 && status < 300;

const awaiting = (keyId: string) =>
  and(eq(table.keyId, keyId), eq(table.target, "relay"), eq(table.status, "sent"));

function relayReads(db: Database) {
  return {
    async useRelay(keyId: string): Promise<void> {
      await db.update(sandboxKeys).set({ target: "relay" }).where(eq(sandboxKeys.id, keyId));
    },
    pending(keyId: string, afterSeq: number | undefined, now: Date): Promise<RelayDelivery[]> {
      const window =
        afterSeq === undefined
          ? gte(table.sentAt, new Date(now.getTime() - replayWindowMs))
          : gt(table.seq, afterSeq);
      return db
        .select()
        .from(table)
        .where(and(awaiting(keyId), window))
        .orderBy(asc(table.seq))
        .limit(replayLimit);
    },
    async awaitingFor(keyId: string, id: string): Promise<RelayDelivery | undefined> {
      const [row] = await db
        .select()
        .from(table)
        .where(and(awaiting(keyId), eq(table.id, id)));
      return row;
    },
  };
}

function relayWrites(db: Database) {
  return {
    async record(id: string, result: LocalResult, now: Date): Promise<RelayDelivery | undefined> {
      const [row] = await db
        .update(table)
        .set({
          status: isSuccess(result.status) ? "delivered" : "failed",
          responseStatus: result.status,
          durationMs: result.durationMs,
          lastError: result.error ?? null,
          deliveredAt: now,
        })
        .where(eq(table.id, id))
        .returning();
      return row;
    },
  };
}

function relayReplays(db: Database) {
  return {
    /** Queues a fresh copy toward the key's current target; the original stays as history. */
    async replay(userId: string, id: string, now: Date): Promise<RelayDelivery | undefined> {
      const [source] = await db
        .select({ delivery: table, key: sandboxKeys })
        .from(table)
        .innerJoin(sandboxKeys, eq(sandboxKeys.id, table.keyId))
        .where(
          and(
            eq(table.id, id),
            eq(sandboxKeys.userId, userId),
            isNull(sandboxKeys.revokedAt),
            gt(sandboxKeys.expiresAt, now),
          ),
        );
      if (source === undefined) return undefined;
      const { delivery, key } = source;
      const [row] = await db
        .insert(table)
        .values({
          keyId: key.id,
          eventId: delivery.eventId,
          provider: delivery.provider,
          event: delivery.event,
          eventType: delivery.eventType,
          target: key.target,
          webhookUrl: key.webhookUrl,
          dueAt: now,
        })
        .returning();
      return row;
    },
  };
}

/** Relay bookkeeping: what a key still has to receive, and what its local server said. */
export function relayRepository(db: Database) {
  return { ...relayReads(db), ...relayWrites(db), ...relayReplays(db) };
}

export type RelayRepository = ReturnType<typeof relayRepository>;
