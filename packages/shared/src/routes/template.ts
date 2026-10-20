import { sharedCatalogs } from "../i18n/languages.js";
import type { Language } from "../i18n/languages.js";

/** The Markdown skeleton a new itinerary starts from. */
export function routeTemplate(language: Language): string {
  return sharedCatalogs[language].template;
}
