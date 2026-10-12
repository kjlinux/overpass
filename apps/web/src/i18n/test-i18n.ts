import type { Language } from "@overpass/shared";
import i18next from "i18next";
import { createI18n } from "./i18n";
import { namespaces } from "./locale-backend";

/** Initialises every namespace for a test, from the real translation files. */
export async function setupTestI18n(language: Language = "fr"): Promise<void> {
  if (!i18next.isInitialized) await createI18n(language);
  await i18next.loadNamespaces(namespaces);
  await i18next.changeLanguage(language);
}
