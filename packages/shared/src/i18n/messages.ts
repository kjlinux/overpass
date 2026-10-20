import { sharedCatalogs } from "./languages.js";
import type { Language, SharedCatalog } from "./languages.js";

export const apiMessages = sharedCatalogs;
export type ErrorCode = keyof SharedCatalog["errors"];
export type FieldCode = keyof SharedCatalog["fields"];

/** Returns the translated message for a stable error code. */
export function errorMessage(code: ErrorCode, language: Language): string {
  return apiMessages[language].errors[code];
}

/** Translates a field validation code, falling back to the generic required text. */
export function fieldMessage(code: string, language: Language): string {
  const fields: Record<string, string> = apiMessages[language].fields;
  return fields[code] ?? apiMessages[language].fields.required;
}
