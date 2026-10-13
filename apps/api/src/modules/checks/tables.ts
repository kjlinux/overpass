import type { PotholeStatus } from "@overpass/shared";
import { char, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const utc = (name: string) => timestamp(name, { withTimezone: true });

/** Mirror of migrations/0004_checks; the SQL files stay the source of truth. */
export const checks = pgTable("checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id").notNull(),
  userId: uuid("user_id").notNull(),
  country: char("country", { length: 2 }).notNull(),
  environment: text("environment").$type<"test" | "production">().notNull(),
  checkedAt: utc("checked_at").notNull(),
});

export const potholes = pgTable("potholes", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id").notNull(),
  userId: uuid("user_id"),
  description: text("description").notNull(),
  status: text("status").$type<PotholeStatus>().notNull().default("open"),
  createdAt: utc("created_at").notNull(),
  updatedAt: utc("updated_at").notNull(),
});
