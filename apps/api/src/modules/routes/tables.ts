import type { Language } from "@overpass/shared";
import {
  boolean,
  char,
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
  countries: char("countries", { length: 2 }).array().notNull(),
  simulated: boolean("simulated").notNull(),
});

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
});

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
