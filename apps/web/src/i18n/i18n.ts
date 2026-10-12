import { supportedLanguages } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { detectLanguage, storedLanguage } from "../app/language";
import { localeBackend } from "./locale-backend";

/** Namespaces every page needs; others load with their page. */
export const coreNamespaces = ["app", "layout", "ui"];

/** Creates the i18next instance for one language and the core namespaces. */
export async function createI18n(language: Language): Promise<void> {
  await i18next
    .use(localeBackend)
    .use(initReactI18next)
    .init({
      lng: language,
      supportedLngs: [...supportedLanguages],
      fallbackLng: false,
      load: "languageOnly",
      ns: coreNamespaces,
      defaultNS: "app",
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

/** Initialises translations with the detected language only. */
export async function initI18n(): Promise<void> {
  const language = detectLanguage(location.pathname, storedLanguage(), navigator.language);
  document.documentElement.lang = language;
  await createI18n(language);
}
