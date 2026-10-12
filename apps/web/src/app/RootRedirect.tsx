import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { initialLanguage } from "./language";
import { PageSkeleton } from "./PageSkeleton";

/** Sends a URL without a known language prefix to the active language. */
export function RootRedirect() {
  const { route } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    route(`/${initialLanguage(i18n.language)}`, true);
  }, [route, i18n.language]);

  return <PageSkeleton />;
}
