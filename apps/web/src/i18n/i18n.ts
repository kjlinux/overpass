import { defaultLanguage, supportedLanguages } from "@overpass/shared";
import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

export const webResources = { fr: { translation: fr }, en: { translation: en } };

/** Initialises translations; the URL prefix wins, then the stored choice. */
export async function initI18n(): Promise<void> {
  await i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: webResources,
      supportedLngs: [...supportedLanguages],
      fallbackLng: defaultLanguage,
      detection: { order: ["path", "localStorage", "navigator"], caches: ["localStorage"] },
      interpolation: { escapeValue: false },
    });
}
