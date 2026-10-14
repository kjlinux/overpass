import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { sandboxDeliveries, sandboxEvents, sandboxObjects } from "../tables.js";

export type QueuedDelivery = typeof sandboxDeliveries.$inferSelect;
export type DeliveryUpdate = Partial<
  Pick<
    QueuedDelivery,
    | "status"
    | "body"
    | "headers"
    | "responseStatus"
    | "durationMs"
    | "lastError"
    | "dueAt"
    | "sentAt"
    | "deliveredAt"
  >
>;

const historyMs = 7 * 86_400_000;
const table = sandboxDeliveries;

/** The delivery queue: a lease per claim, so concurrent workers never send the same row. */
export function deliveryQueue(db: Database) {
  return {
    claim(now: Date, limit: number, leaseMs: number): Promise<QueuedDelivery[]> {
      const free = or(isNull(table.leasedUntil), lte(table.leasedUntil, now));
      const due = db
        .select({ id: table.id })
        .from(table)
        .where(and(eq(table.status, "scheduled"), lte(table.dueAt, now), free))
        .orderBy(asc(table.dueAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      return db
        .update(table)
        .set({
          attempts: sql`${table.attempts} + 1`,
          leasedUntil: new Date(now.getTime() + leaseMs),
        })
        .where(inArray(table.id, due))
        .returning();
    },
    async finish(id: string, update: DeliveryUpdate): Promise<void> {
      await db
        .update(table)
        .set({ ...update, leasedUntil: null })
        .where(eq(table.id, id));
    },
    async purge(now: Date): Promise<{ events: number; objects: number }> {
      const cutoff = new Date(now.getTime() - historyMs);
      const events = await db
        .delete(sandboxEvents)
        .where(lt(sandboxEvents.createdAt, cutoff))
        .returning({ id: sandboxEvents.id });
      const objects = await db
        .delete(sandboxObjects)
        .where(lt(sandboxObjects.updatedAt, cutoff))
        .returning({ id: sandboxObjects.objectId });
      return { events: events.length, objects: objects.length };
    },
  };
}

export type DeliveryQueue = ReturnType<typeof deliveryQueue>;
