import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import type { CreateKeyParams, RecordEventParams, SandboxRepository } from "./model.js";
import { sandboxEvents, sandboxKeys } from "./tables.js";

function keyQueries(db: Database) {
  return {
    create: async (params: CreateKeyParams) => {
      const rows = await db
        .insert(sandboxKeys)
        .values({
          userId: params.userId ?? null,
          providerId: params.providerId,
          keyHash: params.keyHash,
          expiresAt: params.expiresAt,
          quotaRemaining: params.quota,
        })
        .returning();
      const [inserted] = rows;
      if (inserted === undefined) throw new Error("sandbox_key_insert_failed");
      return inserted;
    },

    findActive: async (keyHash: string, now: Date) => {
      const [found] = await db
        .select()
        .from(sandboxKeys)
        .where(and(eq(sandboxKeys.keyHash, keyHash), gt(sandboxKeys.expiresAt, now)));
      return found ?? null;
    },

    decrement: async (keyId: string) => {
      const [updated] = await db
        .update(sandboxKeys)
        .set({ quotaRemaining: sql`${sandboxKeys.quotaRemaining} - 1` })
        .where(and(eq(sandboxKeys.id, keyId), gt(sandboxKeys.quotaRemaining, 0)))
        .returning({ id: sandboxKeys.id });
      return updated !== undefined;
    },
  };
}

function eventQueries(db: Database) {
  return {
    record: async (params: RecordEventParams) => {
      const rows = await db
        .insert(sandboxEvents)
        .values({
          keyId: params.keyId,
          scenario: params.scenario,
          requestMethod: params.requestMethod,
          requestPath: params.requestPath,
          requestHeaders: params.requestHeaders,
          requestBody: params.requestBody,
          responseStatus: params.responseStatus,
          responseHeaders: params.responseHeaders,
          responseBody: params.responseBody,
          webhooks: params.webhooks as unknown[],
        })
        .returning();
      const [event] = rows;
      if (event === undefined) throw new Error("sandbox_event_insert_failed");
      return event;
    },

    listByKey: async (keyId: string, limit: number) => {
      return db
        .select()
        .from(sandboxEvents)
        .where(eq(sandboxEvents.keyId, keyId))
        .orderBy(desc(sandboxEvents.createdAt))
        .limit(limit);
    },

    purge: async (olderThan: Date) => {
      const deleted = await db
        .delete(sandboxEvents)
        .where(lt(sandboxEvents.createdAt, olderThan))
        .returning({ id: sandboxEvents.id });
      return deleted.length;
    },
  };
}

export function createSandboxRepository(db: Database): SandboxRepository {
  const keys = keyQueries(db);
  const events = eventQueries(db);
  return {
    createKey: keys.create,
    findActiveKeyByHash: keys.findActive,
    decrementQuota: keys.decrement,
    recordEvent: events.record,
    listEventsByKey: events.listByKey,
    purgeOldEvents: events.purge,
  };
}
