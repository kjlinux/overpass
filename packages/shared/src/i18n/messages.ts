import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import type { Language } from "./languages.js";

export const apiMessages = { fr, en } satisfies Record<Language, typeof fr>;
export type ErrorCode = keyof typeof fr.errors;

/** Returns the translated message for a stable error code. */
export function errorMessage(code: ErrorCode, language: Language): string {
  return apiMessages[language].errors[code];
}
