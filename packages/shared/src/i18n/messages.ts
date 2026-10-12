import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import type { Language } from "./languages.js";

export const apiMessages = { fr, en } satisfies Record<Language, typeof fr>;
export type ErrorCode = keyof typeof fr.errors;
export type FieldCode = keyof typeof fr.fields;

/** Returns the translated message for a stable error code. */
export function errorMessage(code: ErrorCode, language: Language): string {
  return apiMessages[language].errors[code];
}

/** Translates a field validation code, falling back to the generic required text. */
export function fieldMessage(code: string, language: Language): string {
  const fields: Record<string, string> = apiMessages[language].fields;
  return fields[code] ?? apiMessages[language].fields.required;
}
