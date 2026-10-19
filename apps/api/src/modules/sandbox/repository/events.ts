import { and, asc, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { sandboxDeliveries, sandboxEvents, sandboxKeys } from "../tables.js";

export type EventRow = typeof sandboxEvents.$inferSelect;
export type DeliveryRow = typeof sandboxDeliveries.$inferSelect;
export type EventInsert = Omit<typeof sandboxEvents.$inferInsert, "id" | "seq">;
export type DeliveryInsert = Omit<typeof sandboxDeliveries.$inferInsert, "id" | "seq" | "eventId">;

export const eventsPageSize = 20;

/** The inspector history: one event per call, with the webhooks it scheduled. */
export function eventsRepository(db: Database) {
  return {
    /** Event and deliveries land together, so the worker never sees half a call. */
    async record(event: EventInsert, deliveries: DeliveryInsert[]): Promise<string> {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(sandboxEvents)
          .values(event)
          .returning({ id: sandboxEvents.id });
        if (row === undefined) throw new Error("sandbox event insert returned nothing");
        if (deliveries.length > 0) {
          await tx
            .insert(sandboxDeliveries)
            .values(deliveries.map((delivery) => ({ ...delivery, eventId: row.id })));
        }
        return row.id;
      });
    },
    async page(keyId: string, before: number | undefined) {
      const filter = before === undefined ? undefined : lt(sandboxEvents.seq, before);
      const events = await db
        .select()
        .from(sandboxEvents)
        .where(and(eq(sandboxEvents.keyId, keyId), filter))
        .orderBy(desc(sandboxEvents.seq))
        .limit(eventsPageSize);
      const ids = events.map((event) => event.id);
      const deliveries =
        ids.length === 0
          ? []
          : await db
              .select()
              .from(sandboxDeliveries)
              .where(inArray(sandboxDeliveries.eventId, ids))
              .orderBy(asc(sandboxDeliveries.seq));
      return { events, deliveries };
    },
  };
}

/** One event with its deliveries; demo-only lookups ignore every member's event. */
export function eventLookup(db: Database) {
  async function withDeliveries(event: EventRow | undefined) {
    if (event === undefined) return undefined;
    const deliveries = await db
      .select()
      .from(sandboxDeliveries)
      .where(eq(sandboxDeliveries.eventId, event.id))
      .orderBy(asc(sandboxDeliveries.seq));
    return { event, deliveries };
  }
  return {
    async byId(id: string) {
      const [row] = await db.select().from(sandboxEvents).where(eq(sandboxEvents.id, id));
      return withDeliveries(row);
    },
    async demoById(id: string) {
      const [row] = await db
        .select({ event: sandboxEvents })
        .from(sandboxEvents)
        .innerJoin(sandboxKeys, eq(sandboxKeys.id, sandboxEvents.keyId))
        .where(and(eq(sandboxEvents.id, id), isNull(sandboxKeys.userId)));
      return withDeliveries(row?.event);
    },
  };
}

export type EventLookup = ReturnType<typeof eventLookup>;
export type EventsRepository = ReturnType<typeof eventsRepository>;
