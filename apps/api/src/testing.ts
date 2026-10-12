import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { buildApp } from "./app.js";
import { createTestDatabase } from "./db/testing.js";
import { captureMailer } from "./mail/testing.js";

export const webOrigin = "http://web.test";
export const password = "correct horse battery";

/** A full API on an in-process PostgreSQL, with mails captured instead of sent. */
export async function createTestApp() {
  const database = await createTestDatabase();
  const mailer = captureMailer();
  const app = await buildApp({
    config: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      TRUST_PROXY: false,
      WEB_ORIGIN: webOrigin,
      SESSION_SECRET: "test-secret-with-at-least-32-characters!",
    },
    db: database.db,
    mailer,
  });
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

/** Registers an account through the API and returns its session cookie. */
export async function registerAccount(app: FastifyInstance, email: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    headers: { origin: webOrigin },
    payload: { email, password, country: "CI" },
  });
  return sessionCookie(response);
}
