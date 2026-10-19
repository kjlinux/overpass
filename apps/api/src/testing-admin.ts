import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Database } from "./db/client.js";
import { promoteAdmin } from "./testing-discussions.js";
import { call } from "./testing-routes.js";
import { registerAccount } from "./testing.js";

/** Signs up an account and makes it an admin; the role is read again at each request. */
export async function registerAdmin(app: FastifyInstance, db: Database, email: string) {
  const cookie = await registerAccount(app, email);
  await promoteAdmin(db, email);
  return cookie;
}

export const moderateRoute = (
  app: FastifyInstance,
  cookie: string,
  id: string,
  decision: "hide" | "restore",
  reason?: string,
) =>
  call(app, "POST", `/v1/admin/routes/${id}/moderation`, {
    cookie,
    payload: reason === undefined ? { decision } : { decision, reason },
  });

export const reportRoute = (
  app: FastifyInstance,
  cookie: string,
  id: string,
  reason = "Le lien vers la documentation est mort.",
) => call(app, "POST", `/v1/routes/${id}/reports`, { cookie, payload: { reason } });

export type LogRow = { action: string; target_kind: string; target_id: string; reason: string };

/** The moderation log as stored, oldest first. */
export async function logRows(db: Database): Promise<LogRow[]> {
  const result: unknown = await db.execute(
    sql`select action, target_kind, target_id, reason from moderation_actions order by created_at, id`,
  );
  return (result as { rows: LogRow[] }).rows;
}

export const userIdOf = async (db: Database, email: string): Promise<string> => {
  const result: unknown = await db.execute(sql`select id from users where email = ${email}`);
  return String((result as { rows: { id: string }[] }).rows[0]?.id);
};
