import { resolve } from "node:path";

export const outbox = resolve("test-results/outbox");

export const databaseUrl =
  process.env["E2E_DATABASE_URL"] ?? "postgres://overpass:overpass@127.0.0.1:5432/overpass";

/** Shared by the API, the webhook worker and the CLI runs: the same secret signs every webhook. */
export const apiEnv = {
  DATABASE_URL: databaseUrl,
  SESSION_SECRET: "e2e-only-secret-with-more-than-32-characters",
  WEB_ORIGIN: "http://127.0.0.1:5173",
  LOG_LEVEL: "warn",
  MAIL_OUTBOX_DIR: outbox,
};
