import { defaultLanguage } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import { useTranslation } from "react-i18next";
import { toLanguage } from "./language";

/** The active language, as set from the URL prefix by the language shell. */
export function useLanguage(): Language {
  const { i18n } = useTranslation();
  return toLanguage(i18n.language) ?? defaultLanguage;
}
