import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const utc = (name: string) => timestamp(name, { withTimezone: true });

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: utc("created_at").notNull().defaultNow(),
});

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id"),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull().default("fr"),
  country: varchar("country", { length: 2 }),
  stack: varchar("stack", { length: 32 }),
  routeId: uuid("route_id"),
  acceptedReplyId: uuid("accepted_reply_id"),
  status: text("status").notNull().default("open"),
  reportsCount: integer("reports_count").notNull().default(0),
  createdAt: utc("created_at").notNull().defaultNow(),
  updatedAt: utc("updated_at").notNull().defaultNow(),
});

export const replies = pgTable("replies", {
  id: uuid("id").primaryKey(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  authorId: uuid("author_id"),
  content: text("content").notNull(),
  usefulVotes: integer("useful_votes").notNull().default(0),
  status: text("status").notNull().default("visible"),
  reportsCount: integer("reports_count").notNull().default(0),
  createdAt: utc("created_at").notNull().defaultNow(),
  updatedAt: utc("updated_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id"),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull().default("fr"),
  category: text("category").notNull().default("news"),
  status: text("status").notNull().default("draft"),
  publishedAt: utc("published_at"),
  createdAt: utc("created_at").notNull().defaultNow(),
  updatedAt: utc("updated_at").notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  language: text("language").notNull().default("fr"),
  confirmationToken: text("confirmation_token").notNull(),
  confirmedAt: utc("confirmed_at"),
  unsubscribedAt: utc("unsubscribed_at"),
  createdAt: utc("created_at").notNull().defaultNow(),
});
