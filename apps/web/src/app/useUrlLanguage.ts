import type { Language } from "@overpass/shared";
import { useEffect } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useShareTags } from "../share";
import { rememberLanguage } from "./language";

/** Applies the URL language to the document, i18next and storage, then the share tags. */
export function useUrlLanguage(language: Language | undefined): void {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (language === undefined) return;
    document.documentElement.lang = language;
    rememberLanguage(language);
    void i18n.changeLanguage(language);
  }, [i18n, language]);
  useShareTags(language);
}
