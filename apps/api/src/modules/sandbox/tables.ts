import {
  bigint,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const stamp = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const sandboxKeys = pgTable("sandbox_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  provider: text("provider").notNull(),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(),
  scenario: text("scenario").notNull(),
  target: text("target").notNull(),
  webhookUrl: text("webhook_url"),
  quota: integer("quota").notNull(),
  expiresAt: stamp("expires_at").notNull(),
  revokedAt: stamp("revoked_at"),
  createdAt: stamp("created_at").notNull(),
});

export const sandboxEvents = pgTable("sandbox_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  seq: bigint("seq", { mode: "number" }).generatedAlwaysAsIdentity(),
  keyId: uuid("key_id").notNull(),
  provider: text("provider").notNull(),
  scenario: text("scenario").notNull(),
  request: jsonb("request").notNull(),
  response: jsonb("response").notNull(),
  createdAt: stamp("created_at").notNull(),
});

export const sandboxObjects = pgTable(
  "sandbox_objects",
  {
    keyId: uuid("key_id").notNull(),
    provider: text("provider").notNull(),
    kind: text("kind").notNull(),
    objectId: text("object_id").notNull(),
    body: jsonb("body").notNull(),
    createdAt: stamp("created_at").notNull().defaultNow(),
    updatedAt: stamp("updated_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.keyId, table.provider, table.kind, table.objectId] })],
);

export const sandboxDeliveries = pgTable("sandbox_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  seq: bigint("seq", { mode: "number" }).generatedAlwaysAsIdentity(),
  keyId: uuid("key_id").notNull(),
  eventId: uuid("event_id").notNull(),
  provider: text("provider").notNull(),
  event: jsonb("event").notNull(),
  eventType: text("event_type").notNull(),
  target: text("target").notNull(),
  webhookUrl: text("webhook_url"),
  status: text("status").notNull().default("scheduled"),
  attempts: integer("attempts").notNull().default(0),
  body: text("body").notNull().default(""),
  headers: jsonb("headers").notNull().default({}),
  responseStatus: integer("response_status"),
  durationMs: integer("duration_ms"),
  lastError: text("last_error"),
  dueAt: stamp("due_at").notNull(),
  leasedUntil: stamp("leased_until"),
  sentAt: stamp("sent_at"),
  deliveredAt: stamp("delivered_at"),
  createdAt: stamp("created_at").notNull().defaultNow(),
});
