import { eq, lte, sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Database } from "../db/client.js";

export const rateLimitCounters = pgTable("rate_limit_counters", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export type CounterState = { count: number; ttlMs: number };

/** Fixed-window counters; the store behind every rate limit and, later, the sandbox quotas. */
export type CounterStore = {
  hit(key: string, windowMs: number): Promise<CounterState>;
  peek(key: string): Promise<CounterState>;
  purgeExpired(): Promise<number>;
};

const table = rateLimitCounters;
const ttl = sql<number>`greatest(0, extract(epoch from ${table.resetAt} - now()) * 1000)`.mapWith(
  Number,
);

/** One upsert per hit, so concurrent requests on several instances never lose a count. */
export function postgresCounters(db: Database): CounterStore {
  return {
    hit: async (key, windowMs) => {
      const expired = sql`${table.resetAt} <= now()`;
      const freshReset = sql`now() + ${windowMs} * interval '1 millisecond'`;
      const [row] = await db
        .insert(table)
        .values({ key, count: 1, resetAt: freshReset })
        .onConflictDoUpdate({
          target: table.key,
          set: {
            count: sql`case when ${expired} then 1 else ${table.count} + 1 end`,
            resetAt: sql`case when ${expired} then excluded.reset_at else ${table.resetAt} end`,
          },
        })
        .returning({ count: table.count, ttlMs: ttl });
      return row ?? { count: 1, ttlMs: windowMs };
    },
    peek: async (key) => {
      const [row] = await db
        .select({ count: table.count, ttlMs: ttl })
        .from(table)
        .where(sql`${eq(table.key, key)} and ${table.resetAt} > now()`);
      return row ?? { count: 0, ttlMs: 0 };
    },
    purgeExpired: async () =>
      (
        await db
          .delete(table)
          .where(lte(table.resetAt, sql`now()`))
          .returning({ key: table.key })
      ).length,
  };
}
