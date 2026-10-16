import type { ContentStatus, Language } from "@overpass/shared";
import {
  char,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const utc = (name: string) => timestamp(name, { withTimezone: true });

/** Mirror of migrations/0008_discussions; the SQL files stay the source of truth. */
export const topics = pgTable("topics", {
  slug: text("slug").primaryKey(),
  position: integer("position").notNull(),
  names: jsonb("names").$type<Record<Language, string>>().notNull(),
  descriptions: jsonb("descriptions").$type<Record<Language, string>>().notNull(),
});

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id"),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  errorText: text("error_text"),
  codeText: text("code_text"),
  language: text("language").$type<Language>().notNull(),
  country: char("country", { length: 2 }),
  stack: text("stack"),
  routeId: uuid("route_id"),
  serviceId: uuid("service_id"),
  acceptedReplyId: uuid("accepted_reply_id"),
  status: text("status").$type<ContentStatus>().notNull().default("visible"),
  createdAt: utc("created_at").notNull(),
  lastActivityAt: utc("last_activity_at").notNull(),
});

export const replies = pgTable("replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull(),
  authorId: uuid("author_id"),
  content: text("content").notNull(),
  usefulCount: integer("useful_count").notNull().default(0),
  status: text("status").$type<ContentStatus>().notNull().default("visible"),
  createdAt: utc("created_at").notNull(),
});

export const replyVotes = pgTable(
  "reply_votes",
  {
    replyId: uuid("reply_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: utc("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.replyId, table.userId] })],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<"thread" | "reply">().notNull(),
  targetId: uuid("target_id").notNull(),
  userId: uuid("user_id").notNull(),
  createdAt: utc("created_at").notNull(),
  resolvedAt: utc("resolved_at"),
});
