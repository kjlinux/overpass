import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Database } from "./db/client.js";
import { call } from "./testing-routes.js";
import type { Body } from "./testing-routes.js";

export const sampleThread = {
  topic: "career",
  title: "Comment fixer mon taux journalier en freelance ?",
  content: "Je démarre en freelance à Abidjan. Comment estimer un taux juste ?",
  language: "fr",
  country: "CI",
  stack: "laravel",
};

/** Opens a thread and returns its id. */
export async function openThread(
  app: FastifyInstance,
  cookie: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { status, body } = await call(app, "POST", "/v1/threads", {
    cookie,
    payload: { ...sampleThread, ...overrides },
  });
  if (status !== 201) throw new Error(`thread failed with ${String(status)}`);
  return String(body.data?.id);
}

/** Posts a reply and returns its id. */
export async function replyTo(
  app: FastifyInstance,
  cookie: string,
  threadId: string,
  content = "Partez de vos charges mensuelles et divisez par 15 jours facturés.",
): Promise<string> {
  const { status, body } = await call(app, "POST", `/v1/threads/${threadId}/replies`, {
    cookie,
    payload: { content },
  });
  if (status !== 201) throw new Error(`reply failed with ${String(status)}`);
  return String(body.data?.id);
}

export async function readThread(app: FastifyInstance, threadId: string, cookie?: string) {
  return call(app, "GET", `/v1/threads/${threadId}`, cookie === undefined ? {} : { cookie });
}

/** The replies of a thread detail, typed loosely for assertions. */
export function itemsOf(body: Body): Record<string, unknown>[] {
  return (body.data?.items ?? []) as Record<string, unknown>[];
}

export async function promoteAdmin(db: Database, email: string): Promise<void> {
  await db.execute(sql`update users set role = 'admin' where email = ${email}`);
}
