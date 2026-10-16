import type { ProposalStatus } from "@overpass/shared";
import { char, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const utc = (name: string) => timestamp(name, { withTimezone: true });

/** Mirror of migrations/0010_requests; the SQL files stay the source of truth. */
export const serviceProposals = pgTable("service_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  name: text("name").notNull(),
  category: text("category").$type<"payment" | "sms" | "ussd">().notNull(),
  country: char("country", { length: 2 }).notNull(),
  docsUrl: text("docs_url").notNull(),
  status: text("status").$type<ProposalStatus>().notNull().default("pending"),
  reason: text("reason"),
  serviceId: uuid("service_id"),
  decidedBy: uuid("decided_by"),
  decidedAt: utc("decided_at"),
  createdAt: utc("created_at").notNull(),
});

export const simulatorVotes = pgTable(
  "simulator_votes",
  {
    serviceId: uuid("service_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: utc("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.userId] })],
);
