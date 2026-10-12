import { useEffect } from "preact/hooks";
import { Route, Router, useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { ErrorBoundary, ErrorPage } from "../pages/errors";
import { rememberLanguage, toLanguage } from "./language";
import { lazyPage } from "./lazyPage";
import { RootRedirect } from "./RootRedirect";

const HomePage = lazyPage("app", async () => (await import("./HomePage")).HomePage);
const ComponentsPage = lazyPage(
  "showcase",
  async () => (await import("../pages/showcase")).ComponentsPage,
);

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
    <ErrorBoundary language={language}>
      <Router>
        <Route path="/" component={HomePage} />
        <Route path="/components" component={ComponentsPage} />
        <Route default component={NotFound} />
      </Router>
    </ErrorBoundary>
  );
}

function NotFound() {
  const { i18n } = useTranslation();
  const language = toLanguage(i18n.language);
  if (language === undefined) return <RootRedirect />;
  return <ErrorPage kind="notFound" language={language} />;
}
