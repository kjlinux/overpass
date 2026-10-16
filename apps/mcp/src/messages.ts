import type { Language } from "@overpass/shared";
import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };

export type Messages = typeof en;

const messages: Record<Language, Messages> = { fr, en };

export function messagesFor(language: Language): Messages {
  return messages[language];
}

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
