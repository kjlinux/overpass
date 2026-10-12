import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useParams } from "react-router";
import { initialLanguage, toLanguage } from "./language";

/** Applies the language from the URL prefix and redirects unknown prefixes. */
export function LanguageLayout() {
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const language = toLanguage(lang);

  useEffect(() => {
    if (language === undefined) return;
    document.documentElement.lang = language;
    void i18n.changeLanguage(language);
  }, [i18n, language]);

  if (language === undefined) return <Navigate to={`/${initialLanguage(i18n.language)}`} replace />;
  return <Outlet />;
}

/** Sends a prefix-less URL to the detected or stored language. */
export function RootRedirect() {
  const { i18n } = useTranslation();
  return <Navigate to={`/${initialLanguage(i18n.language)}`} replace />;
}
