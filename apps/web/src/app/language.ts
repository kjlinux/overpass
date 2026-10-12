import { defaultLanguage, supportedLanguages } from "@overpass/shared";
import type { Language } from "@overpass/shared";

/** Narrows a URL segment to a supported language, or returns undefined. */
export function toLanguage(segment: string | undefined): Language | undefined {
  return supportedLanguages.find((language) => language === segment);
}

/** Chooses the language used when the URL has no prefix yet. */
export function initialLanguage(detected: string | undefined): Language {
  return toLanguage(detected?.slice(0, 2)) ?? defaultLanguage;
}
