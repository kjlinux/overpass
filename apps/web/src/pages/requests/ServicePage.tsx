import { countryName } from "@overpass/shared";
import type { Service } from "@overpass/shared";
import type { JSX } from "preact";
import { useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Chip, Flag, Skeleton } from "../../components/ui";
import { LoadError } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { ErrorPage } from "../errors";
import { useApi } from "../routes";
import { SimulatorVote } from "./SimulatorVote";

function Coverage({ service }: { service: Service }): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  if (service.countries.length === 0) return <p class="text-ink-2">{t("service.noCountry")}</p>;
  return (
    <ul class="m-0 flex list-none flex-wrap gap-x-6 gap-y-3 p-0">
      {service.countries.map((code) => (
        <li key={code}>
          <Flag country={code} name={countryName(code, language)} />
        </li>
      ))}
    </ul>
  );
}

/** A service with a simulator sends to the test track; one without collects votes for one. */
function Simulator({ service }: { service: Service }): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  if (service.simulated) {
    const href = localizedPath(language, `/sandbox?provider=${service.slug}`);
    return (
      <div class="flex flex-col items-start gap-4">
        <p>{t("service.simulated")}</p>
        <ButtonLink variant="primary" href={href}>
          {t("service.track")}
        </ButtonLink>
      </div>
    );
  }
  return (
    <div class="flex flex-col gap-4">
      <p class="max-w-prose">{t("service.noSimulator", { service: service.name })}</p>
      <SimulatorVote slug={service.slug} />
    </div>
  );
}

function ServiceView({ service }: { service: Service }): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  return (
    <section class="py-12 md:py-16">
      <div class="flex flex-wrap items-center gap-2">
        <Chip>{t(`category.${service.category}`)}</Chip>
        {service.simulated ? <Chip>{t("service.unofficial")}</Chip> : null}
      </div>
      <h1 class="mt-3 text-h1 font-semibold [overflow-wrap:anywhere]">{service.name}</h1>
      <div class="mt-8 grid border-t border-rule lg:grid-cols-[minmax(0,1fr)_360px]">
        <div class="flex flex-col gap-8 py-8 lg:pr-12">
          <section aria-labelledby="coverage-heading" class="flex flex-col gap-4">
            <h2 id="coverage-heading" class="text-h2 font-semibold">
              {t("service.coverage")}
            </h2>
            <Coverage service={service} />
          </section>
          <a href={localizedPath(language, `/routes?service=${service.slug}`)}>
            {t("service.routes")}
          </a>
        </div>
        <aside
          aria-labelledby="simulator-heading"
          class="flex flex-col gap-4 border-t border-rule py-8 lg:border-l lg:border-t-0 lg:pl-8"
        >
          <h2 id="simulator-heading" class="text-h2 font-semibold">
            {t("service.simulator")}
          </h2>
          <Simulator service={service} />
        </aside>
      </div>
    </section>
  );
}

export function ServicePage(): JSX.Element {
  const language = useLanguage();
  const { params } = useRoute();
  const { state, reload } = useApi<Service[]>("/v1/services");
  const service =
    state.status === "ready" ? state.data.find((item) => item.slug === params["slug"]) : undefined;
  if (state.status === "ready" && service === undefined)
    return <ErrorPage kind="notFound" language={language} />;
  return (
    <Layout language={language}>
      {service !== undefined ? <ServiceView service={service} /> : null}
      {state.status === "loading" ? (
        <div class="py-12">
          <Skeleton lines={6} />
        </div>
      ) : null}
      {state.status === "error" ? (
        <div class="py-12">
          <LoadError error={state.error} onRetry={() => void reload()} />
        </div>
      ) : null}
    </Layout>
  );
}
