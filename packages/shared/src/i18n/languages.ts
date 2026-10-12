export const supportedLanguages = ["fr", "en"] as const;
export type Language = (typeof supportedLanguages)[number];
export const defaultLanguage: Language = "fr";

/** Each language named in itself, for the selector; never translated. */
export const languageNames: Record<Language, string> = { fr: "Français", en: "English" };

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
