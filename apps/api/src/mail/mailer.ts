import nodemailer from "nodemailer";
import type { Config } from "../config.js";

export type MailMessage = { to: string; subject: string; text: string };

export type Mailer = { send(message: MailMessage): Promise<void> };

export type MailLogger = { info(details: object, message: string): void };

type SmtpConfig = Partial<
  Pick<
    Config,
    "SMTP_HOST" | "SMTP_PORT" | "SMTP_SECURE" | "SMTP_USER" | "SMTP_PASSWORD" | "MAIL_FROM"
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

/** Sends through any SMTP server named in the environment; no proprietary API. */
export function createMailer(config: SmtpConfig, logger: MailLogger): Mailer {
  if (config.SMTP_HOST === undefined) return logMailer(logger);
  const auth =
    config.SMTP_USER === undefined
      ? undefined
      : { user: config.SMTP_USER, pass: config.SMTP_PASSWORD ?? "" };
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT ?? 587,
    secure: config.SMTP_SECURE ?? false,
    ...(auth === undefined ? {} : { auth }),
  });
  return {
    send: async (message) => {
      await transport.sendMail({ from: config.MAIL_FROM ?? "no-reply@localhost", ...message });
    },
  };
}
