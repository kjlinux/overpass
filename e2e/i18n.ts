import { test } from "@playwright/test";
import { en, fr } from "./locales.js";
import type { Bundle } from "./locales.js";

export const languages = ["fr", "en"] as const;

export type Language = (typeof languages)[number];

/** The project option that runs every journey in one language. */
export type LanguageOptions = { language: Language };

/** The language of the running project; French when the project names none. */
export function currentLanguage(): Language {
  const use = test.info().project.use as Partial<LanguageOptions>;
  return use.language ?? "fr";
}

/** The locale JSON of one namespace, in the given language or the project's. */
export function locale<N extends keyof Bundle>(
  namespace: N,
  language: Language = currentLanguage(),
): Bundle[N] {
  return (language === "fr" ? fr : en)[namespace];
}

/** Prefixes an application path with the language, the way every link of the site does. */
export function path(route: string, language: Language = currentLanguage()): string {
  return route === "/" ? `/${language}` : `/${language}${route}`;
}

/** A regular expression that matches the end of a localised URL. */
export function urlEndingWith(route: string, language: Language = currentLanguage()): RegExp {
  const escaped = path(route, language).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return new RegExp(`${escaped}$`);
}

/** Fills i18next ({{name}}) and CLI ({name}) placeholders. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{?(\w+)\}?\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** The fixed text before the first placeholder, for a partial match. */
export function lead(template: string): string {
  return (template.split(/\{\{?/)[0] ?? "").trim();
}

/** The fixed text after the last placeholder, for a partial match. */
export function tail(template: string): string {
  return (template.split(/\}\}?/).at(-1) ?? "").trim();
}
