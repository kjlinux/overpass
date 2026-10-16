import type { Language } from "@overpass/shared";
import type { MailMessage } from "../../mail/mailer.js";
import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };

const texts = { fr, en } satisfies Record<Language, typeof fr>;

type Outcome = { name: string; accepted: boolean; reason: string | null; link: string };

function fill(body: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{{${key}}}`, value),
    body,
  );
}

/** Tells the member how the team decided on the service they proposed. */
export function outcomeMail(to: string, language: Language, outcome: Outcome): MailMessage {
  const copy = texts[language];
  const { subject, body } = outcome.accepted ? copy.acceptedMail : copy.rejectedMail;
  const reason = outcome.reason ?? copy.noReason;
  return { to, subject, text: fill(body, { name: outcome.name, reason, link: outcome.link }) };
}
