import type { Language } from "@overpass/shared";
import {
  boolean,
  char,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const utc = (name: string) => timestamp(name, { withTimezone: true });

/** Mirror of migrations/0003_routes; the generated search column is reached through SQL. */
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  category: text("category").$type<"payment" | "sms" | "ussd">().notNull(),
  simulated: boolean("simulated").notNull(),
});

/** Mirror of migrations/0005_service_countries: a covered country is shown once confirmed. */
export const serviceCountries = pgTable(
  "service_countries",
  {
    serviceId: uuid("service_id").notNull(),
    country: char("country", { length: 2 }).notNull(),
    confirmed: boolean("confirmed").notNull().default(false),
    basis: text("basis").$type<"source" | "community">().notNull().default("source"),
    source: text("source"),
    consultedOn: date("consulted_on", { mode: "string" }),
    routeId: uuid("route_id"),
    confirmedAt: utc("confirmed_at"),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.country] })],
);

export const routes = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  translationGroup: uuid("translation_group").notNull().defaultRandom(),
  authorId: uuid("author_id"),
  serviceId: uuid("service_id").notNull(),
  country: char("country", { length: 2 }).notNull(),
  stack: text("stack").notNull(),
  language: text("language").$type<Language>().notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: utc("created_at").notNull(),
  updatedAt: utc("updated_at").notNull(),
  deletedAt: utc("deleted_at"),
  sourceThreadId: uuid("source_thread_id"),
  moderation: text("moderation").$type<"visible" | "hidden">().notNull().default("visible"),
});

/** Mirror of migrations/0015_admin: one report per account and per itinerary. */
export const routeReports = pgTable(
  "route_reports",
  {
    routeId: uuid("route_id").notNull(),
    userId: uuid("user_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: utc("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.routeId, table.userId] })],
);

export const routeVersions = pgTable(
  "route_versions",
  {
    routeId: uuid("route_id").notNull(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    authorId: uuid("author_id"),
    createdAt: utc("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.routeId, table.number] })],
);
