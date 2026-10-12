import { defaultLanguage, supportedLanguages } from "@overpass/shared";
import type { Language } from "@overpass/shared";

const storageKey = "overpass.language";

/** Narrows a URL segment to a supported language, or returns undefined. */
export function toLanguage(segment: string | undefined): Language | undefined {
  return supportedLanguages.find((language) => language === segment);
}

/** Chooses the language used when the URL has no prefix yet. */
export function initialLanguage(detected: string | undefined): Language {
  return toLanguage(detected?.slice(0, 2)) ?? defaultLanguage;
}

/** Detects the language: URL prefix, then stored choice, then browser. */
export function detectLanguage(path: string, stored: string | null, browser: string): Language {
  return (
    toLanguage(path.split("/")[1]) ?? toLanguage(stored ?? undefined) ?? initialLanguage(browser)
  );
}

/** Remembers the language chosen through the URL. */
export function rememberLanguage(language: Language): void {
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    return;
  }
}

/** Reads the remembered language, tolerating blocked storage. */
export function storedLanguage(): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}
