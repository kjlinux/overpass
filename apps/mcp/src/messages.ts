import { readLocales } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import type catalogue from "./locales/en.json";

export type Messages = typeof catalogue;

const messages = readLocales<Messages>(new URL("./locales/", import.meta.url));

export function messagesFor(language: Language): Messages {
  return messages[language];
}

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
