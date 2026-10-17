import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const utc = (name: string) => timestamp(name, { withTimezone: true });

export const sandboxKeys = pgTable("sandbox_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  providerId: text("provider_id").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  quotaRemaining: integer("quota_remaining").notNull().default(100),
  expiresAt: utc("expires_at").notNull(),
  createdAt: utc("created_at").notNull().defaultNow(),
});

export const sandboxEvents = pgTable("sandbox_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyId: uuid("key_id")
    .notNull()
    .references(() => sandboxKeys.id, { onDelete: "cascade" }),
  scenario: text("scenario").notNull(),
  requestMethod: text("request_method").notNull(),
  requestPath: text("request_path").notNull(),
  requestHeaders: jsonb("request_headers").$type<Record<string, string>>().notNull(),
  requestBody: jsonb("request_body"),
  responseStatus: integer("response_status").notNull(),
  responseHeaders: jsonb("response_headers").$type<Record<string, string>>().notNull(),
  responseBody: jsonb("response_body"),
  webhooks: jsonb("webhooks").$type<unknown[]>().notNull(),
  createdAt: utc("created_at").notNull().defaultNow(),
});
