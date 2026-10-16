import type { FastifyInstance } from "fastify";
import type { MailMessage } from "./mail/mailer.js";
import { call } from "./testing-routes.js";

export const subscribe = (app: FastifyInstance, email: string, language = "fr") =>
  call(app, "POST", "/v1/newsletter/subscribe", { payload: { email, language } });

/** The token of the last link of a kind mailed to an address. */
export function tokenMailedTo(
  sent: MailMessage[],
  email: string,
  page: "confirm" | "unsubscribe",
): string {
  const mail = sent.findLast((message) => message.to === email && message.text.includes(page));
  const pattern = new RegExp(`/newsletter/${page}#token=([\\w.-]+)`);
  return pattern.exec(mail?.text ?? "")?.[1] ?? "";
}

/** Subscribes and clicks the confirmation link, as a reader would. */
export async function subscribeConfirmed(
  app: FastifyInstance,
  sent: MailMessage[],
  email: string,
  language = "fr",
): Promise<void> {
  await subscribe(app, email, language);
  const token = tokenMailedTo(sent, email, "confirm");
  const { status } = await call(app, "POST", "/v1/newsletter/confirm", { payload: { token } });
  if (status !== 200) throw new Error(`confirmation failed with ${String(status)}`);
}

export const sampleIssue = (items: { kind: string; id: string }[], language = "fr") => ({
  language,
  subject: "Overpass, la semaine",
  intro: "Les meilleures contributions de la semaine.",
  items,
});

/** Creates a reviewed issue and queues it, returning its id. */
export async function sendIssue(
  app: FastifyInstance,
  admin: string,
  items: { kind: string; id: string }[],
  language = "fr",
): Promise<string> {
  const created = await call(app, "POST", "/v1/newsletter/issues", {
    cookie: admin,
    payload: sampleIssue(items, language),
  });
  const id = String(created.body.data?.id);
  const queued = await call(app, "POST", `/v1/newsletter/issues/${id}/send`, { cookie: admin });
  if (queued.status !== 200) throw new Error(`send failed with ${String(queued.status)}`);
  return id;
}
