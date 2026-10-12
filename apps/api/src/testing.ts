import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { buildApp } from "./app.js";
import { createTestDatabase } from "./db/testing.js";
import { captureMailer } from "./mail/testing.js";

export const webOrigin = "http://web.test";

const mailers = new WeakMap<FastifyInstance, ReturnType<typeof captureMailer>>();
export const password = "correct horse battery";

/** A full API on an in-process PostgreSQL, with mails captured instead of sent. */
export async function createTestApp() {
  const database = await createTestDatabase();
  const mailer = captureMailer();
  const app = await buildApp({
    config: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      TRUST_PROXY: 0,
      WEB_ORIGIN: webOrigin,
      SESSION_SECRET: "test-secret-with-at-least-32-characters!",
    },
    db: database.db,
    mailer,
  });
  mailers.set(app, mailer);
  const close = async () => {
    await app.close();
    await database.close();
  };
  return { app, mailer, close };
}

/** The session cookie set by a response, as a Cookie header value. */
export function sessionCookie(response: LightMyRequestResponse): string {
  const cookie = response.cookies.find((c) => c.name === "overpass_session");
  if (cookie === undefined) throw new Error("no session cookie");
  return `${cookie.name}=${cookie.value}`;
}

/** Signs up through the API and the confirmation e-mail, then returns the session cookie. */
export async function registerAccount(app: FastifyInstance, email: string): Promise<string> {
  const headers = { origin: webOrigin };
  const payload = { email, password, country: "CI" };
  await app.inject({ method: "POST", url: "/v1/auth/register", headers, payload });
  const mail = mailers.get(app)?.sent.findLast((message) => message.to === email);
  const token = /#token=([\w.-]+)/.exec(mail?.text ?? "")?.[1] ?? "";
  const confirm = { method: "POST", url: "/v1/auth/confirm", headers, payload: { token } } as const;
  return sessionCookie(await app.inject(confirm));
}
