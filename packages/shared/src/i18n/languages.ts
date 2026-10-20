import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };

export type SharedCatalog = typeof fr;

/** The language list: a new language is one locales/<code>.json per module plus one entry here. */
export const sharedCatalogs = { fr, en } satisfies Record<string, SharedCatalog>;

export type Language = keyof typeof sharedCatalogs;
export const supportedLanguages = Object.keys(sharedCatalogs) as [Language, ...Language[]];
export const defaultLanguage: Language = "fr";

/** Each language named in itself, for the selector. */
export const languageNames = Object.fromEntries(
  supportedLanguages.map((code) => [code, sharedCatalogs[code].languageName]),
) as Record<Language, string>;

/** Picks the first supported language from an Accept-Language header. */
export function pickLanguage(header: string | undefined): Language {
  const candidates = (header ?? "")
    .split(",")
    .map((part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase());
  const match = candidates.find((code): code is Language =>
    supportedLanguages.some((language) => language === code),
  );
  return match ?? defaultLanguage;
}
