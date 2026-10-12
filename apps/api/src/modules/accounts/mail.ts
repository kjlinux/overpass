import type { Language } from "@overpass/shared";
import type { MailMessage } from "../../mail/mailer.js";
import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };

const texts = { fr, en } satisfies Record<Language, typeof fr>;

/** Builds the reset e-mail in the account language. */
export function resetMail(to: string, language: Language, link: string): MailMessage {
  const { subject, body } = texts[language].resetMail;
  return { to, subject, text: body.replace("{{link}}", link) };
}
