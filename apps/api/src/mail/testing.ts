import type { MailMessage, Mailer } from "./mailer.js";

/** Mailer that keeps every message for assertions. */
export function captureMailer(): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    sent,
    send: (message) => {
      sent.push(message);
      return Promise.resolve();
    },
  };
}
