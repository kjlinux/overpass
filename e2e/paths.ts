import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const outbox = resolve("test-results/outbox");

// The database password has no default anywhere: it comes from the environment or the local .env.
if (process.env["E2E_DATABASE_URL"] === undefined && existsSync(".env"))
  process.loadEnvFile(".env");

function databaseUrlFromEnv(): string {
  const url = process.env["E2E_DATABASE_URL"] ?? process.env["DATABASE_URL"];
  if (url === undefined || url === "") {
    throw new Error("Set E2E_DATABASE_URL, or DATABASE_URL in .env, to run the end-to-end tests.");
  }
  return url;
}

export const databaseUrl = databaseUrlFromEnv();

/** Shared by the API, the webhook worker and the CLI runs: the same secret signs every webhook. */
export const apiEnv = {
  DATABASE_URL: databaseUrl,
  SESSION_SECRET: "e2e-only-secret-with-more-than-32-characters",
  WEB_ORIGIN: "http://127.0.0.1:5173",
  LOG_LEVEL: "warn",
  MAIL_OUTBOX_DIR: outbox,
};

/** CI retries once, to tell a flaky run from a broken one; local runs never retry. */
export const retries = process.env["CI"] === undefined ? 0 : 1;
