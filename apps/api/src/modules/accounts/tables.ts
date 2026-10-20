import type { Language, Role } from "@overpass/shared";
import { char, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const utc = (name: string) => timestamp(name, { withTimezone: true });

/** Mirror of migrations/0001_accounts and 0015_admin; the SQL files stay the source of truth. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  handle: text("handle").notNull(),
  country: char("country", { length: 2 }).notNull(),
  language: text("language").$type<Language>().notNull().default("fr"),
  role: text("role").$type<Role>().notNull().default("member"),
  sessionVersion: integer("session_version").notNull().default(0),
  newsletterConsentAt: utc("newsletter_consent_at"),
  createdAt: utc("created_at").notNull().defaultNow(),
  updatedAt: utc("updated_at").notNull().defaultNow(),
  suspendedAt: utc("suspended_at"),
  suspendedReason: text("suspended_reason"),
});

export const userStacks = pgTable(
  "user_stacks",
  { userId: uuid("user_id").notNull(), stack: text("stack").notNull() },
  (table) => [primaryKey({ columns: [table.userId, table.stack] })],
);

export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  usage: text("usage").$type<"mcp" | "api">().notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: utc("created_at").notNull().defaultNow(),
  lastUsedAt: utc("last_used_at"),
  revokedAt: utc("revoked_at"),
  expiresAt: utc("expires_at").notNull(),
});
