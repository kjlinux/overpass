import { useTranslation } from "react-i18next";
import { Layout } from "../layout";
import { useLanguage } from "./useLanguage";

/** Placeholder home page until the screens are built from DESIGN.md. */
export function HomePage() {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <Layout language={language}>
      <section class="max-w-prose py-16 md:py-24">
        <h1 class="text-display font-semibold md:text-display-lg">{t("app.tagline")}</h1>
        <p class="mt-6">{t("app.intro")}</p>
      </section>
    </Layout>
  );
}
