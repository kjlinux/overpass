import type { Language } from "@overpass/shared";
import type { MailMessage } from "../../mail/mailer.js";
import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };

const texts = { fr, en } satisfies Record<Language, typeof fr>;

type Template = keyof typeof fr;

function fill(body: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{{${key}}}`, value),
    body,
  );
}

/** Builds one of the module's e-mails in the account language. */
function mail(template: Template, to: string, language: Language, values: Record<string, string>) {
  const { subject, body } = texts[language][template];
  return { to, subject, text: fill(body, values) } satisfies MailMessage;
}

export const resetMail = (to: string, language: Language, link: string) =>
  mail("resetMail", to, language, { link });

export const confirmMail = (to: string, language: Language, link: string) =>
  mail("confirmMail", to, language, { link });

export const existsMail = (
  to: string,
  language: Language,
  links: { signIn: string; forgot: string },
) => mail("existsMail", to, language, links);
