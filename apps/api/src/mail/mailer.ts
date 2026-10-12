import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import nodemailer from "nodemailer";
import type { Config } from "../config.js";

export type MailMessage = { to: string; subject: string; text: string };

export type Mailer = { send(message: MailMessage): Promise<void> };

export type MailLogger = { info(details: object, message: string): void };

type SmtpConfig = Partial<
  Pick<
    Config,
    | "SMTP_HOST"
    | "SMTP_PORT"
    | "SMTP_SECURE"
    | "SMTP_REQUIRE_TLS"
    | "SMTP_USER"
    | "SMTP_PASSWORD"
    | "MAIL_FROM"
    | "MAIL_OUTBOX_DIR"
  >
>;

/** Development transport: writes the whole message, links included, to the logs. */
export function logMailer(logger: MailLogger): Mailer {
  return {
    send: (message) => {
      logger.info({ mail: message }, "mail not sent: no SMTP_HOST, message logged instead");
      return Promise.resolve();
    },
  };
}

/** Development and test transport: one JSON file per message, read by the end-to-end tests. */
export function outboxMailer(directory: string, logger: MailLogger): Mailer {
  const log = logMailer(logger);
  return {
    send: async (message) => {
      await mkdir(directory, { recursive: true });
      await writeFile(
        join(directory, `${String(Date.now())}-${randomUUID()}.json`),
        JSON.stringify(message),
      );
      await log.send(message);
    },
  };
}

/** Sends through any SMTP server named in the environment; no proprietary API. */
export function createMailer(config: SmtpConfig, logger: MailLogger): Mailer {
  if (config.SMTP_HOST === undefined) {
    return config.MAIL_OUTBOX_DIR === undefined
      ? logMailer(logger)
      : outboxMailer(config.MAIL_OUTBOX_DIR, logger);
  }
  const auth =
    config.SMTP_USER === undefined
      ? undefined
      : { user: config.SMTP_USER, pass: config.SMTP_PASSWORD ?? "" };
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT ?? 587,
    secure: config.SMTP_SECURE ?? false,
    // Reset links are credentials: never let a stripped STARTTLS send them in clear text.
    requireTLS: config.SMTP_SECURE !== true && config.SMTP_REQUIRE_TLS !== false,
    ...(auth === undefined ? {} : { auth }),
  });
  return {
    send: async (message) => {
      await transport.sendMail({ from: config.MAIL_FROM ?? "no-reply@localhost", ...message });
    },
  };
}
