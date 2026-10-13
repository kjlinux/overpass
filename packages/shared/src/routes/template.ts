import type { Language } from "../i18n/languages.js";
import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };

const templates: Record<Language, string> = { fr: fr.template, en: en.template };

/** The Markdown skeleton a new itinerary starts from. */
export function routeTemplate(language: Language): string {
  return templates[language];
}
