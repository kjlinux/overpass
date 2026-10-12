import { supportedLanguages } from "@overpass/shared";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { detectLanguage, storedLanguage } from "../app/language";
import { localeBackend } from "./locale-backend";

/** Initialises translations with the detected language only. */
export async function initI18n(): Promise<void> {
  const language = detectLanguage(location.pathname, storedLanguage(), navigator.language);
  document.documentElement.lang = language;
  await i18next
    .use(localeBackend)
    .use(initReactI18next)
    .init({
      lng: language,
      supportedLngs: [...supportedLanguages],
      fallbackLng: false,
      load: "languageOnly",
      interpolation: { escapeValue: false },
    });
}
