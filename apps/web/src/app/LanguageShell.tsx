import { useEffect } from "preact/hooks";
import { Route, Router, lazy, useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { rememberLanguage, toLanguage } from "./language";
import { RootRedirect } from "./RootRedirect";

const HomePage = lazy(async () => (await import("./HomePage")).HomePage);

/** Applies the language of the URL prefix and routes the rest of the path. */
export function LanguageShell() {
  const { params } = useRoute();
  const { i18n } = useTranslation();
  const language = toLanguage(params["lang"]);

  useEffect(() => {
    if (language === undefined) return;
    document.documentElement.lang = language;
    rememberLanguage(language);
    void i18n.changeLanguage(language);
  }, [i18n, language]);

  if (language === undefined) return <RootRedirect />;
  return (
    <Router>
      <Route path="/" component={HomePage} />
      <Route default component={RootRedirect} />
    </Router>
  );
}
