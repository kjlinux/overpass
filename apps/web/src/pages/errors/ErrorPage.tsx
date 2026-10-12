import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { ButtonLink } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";

export type ErrorKind = "notFound" | "server";

/** One layout for both error pages: title, one sentence, a way home, a way to the catalogue. */
export function ErrorPage({
  kind,
  language,
}: {
  kind: ErrorKind;
  language: Language;
}): JSX.Element {
  const { t } = useTranslation("errors");
  return (
    <Layout language={language}>
      <section class="max-w-prose py-16 md:py-24">
        <p class="text-caption font-medium text-ink-2">{t(`${kind}.code`)}</p>
        <h1 class="mt-2 text-h1 font-semibold">{t(`${kind}.title`)}</h1>
        <p class="mt-4">{t(`${kind}.text`)}</p>
        <div class="mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink variant="primary" href={localizedPath(language, "/")}>
            {t("backHome")}
          </ButtonLink>
          <a href={localizedPath(language, "/routes")} class="inline-flex min-h-tap items-center">
            {t("browseRoutes")}
          </a>
        </div>
      </section>
    </Layout>
  );
}
