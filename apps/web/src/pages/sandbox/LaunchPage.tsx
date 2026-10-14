import type { SandboxProvider } from "@overpass/shared";
import type { JSX } from "preact";
import { useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Chip } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { useApi } from "../routes/useApi";

/** Stands in for a provider's payment page: the key's scenario already decided the outcome. */
export function LaunchPage(): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();
  const { params } = useRoute();
  const providers = useApi<SandboxProvider[]>("/v1/sandbox/providers").state;
  const id = params["provider"] ?? "";
  const name =
    providers.status === "ready" ? (providers.data.find((item) => item.id === id)?.name ?? id) : id;
  return (
    <Layout language={language}>
      <section class="max-w-prose py-12">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-h1 font-semibold">{t("launchPage.title")}</h1>
          <Chip>{t("provider.unofficial")}</Chip>
        </div>
        <p class="mt-4">{t("launchPage.body", { provider: name })}</p>
        <p class="mt-4 text-caption text-ink-2">
          {t("launchPage.session")} <code class="text-ink">{params["id"] ?? ""}</code>
        </p>
        <ButtonLink
          variant="primary"
          class="mt-8"
          href={localizedPath(language, `/sandbox?provider=${encodeURIComponent(id)}`)}
        >
          {t("launchPage.back")}
        </ButtonLink>
      </section>
    </Layout>
  );
}
