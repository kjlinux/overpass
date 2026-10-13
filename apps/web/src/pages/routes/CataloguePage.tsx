import type { RoutePage, Service } from "@overpass/shared";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { apiRequest } from "../../session";
import { CatalogueFilters } from "./CatalogueFilters";
import { CatalogueResults } from "./CatalogueResults";
import { queryFromSearch, searchFromQuery } from "./query";
import type { CatalogueQuery } from "./query";
import { useApi } from "./useApi";

/** Keeps every loaded page, so "show more" appends instead of replacing. */
function useCatalogue(query: CatalogueQuery) {
  const search = searchFromQuery(query);
  const { state, reload } = useApi<RoutePage>(`/v1/routes${search}`);
  const [extra, setExtra] = useState<RoutePage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setExtra(null);
  }, [search]);
  const first = state.status === "ready" ? state.data : null;
  const page = first === null ? null : (extra ?? first);
  const more = async () => {
    if (page?.nextCursor == null) return;
    setLoadingMore(true);
    const next = await apiRequest<RoutePage>(
      "GET",
      `/v1/routes${searchFromQuery(query, page.nextCursor)}`,
    );
    setLoadingMore(false);
    if (next.error === null)
      setExtra({ items: [...page.items, ...next.data.items], nextCursor: next.data.nextCursor });
  };
  return { state, reload, page, more, loadingMore };
}

function Results({ query }: { query: CatalogueQuery }): JSX.Element {
  const { t } = useTranslation("ui");
  const { state, reload, page, more, loadingMore } = useCatalogue(query);
  if (state.status === "error") {
    return (
      <div class="flex flex-col items-start gap-4">
        <FormAlert error={state.error} />
        <Button onClick={() => void reload()}>{t("retry")}</Button>
      </div>
    );
  }
  if (page === null) return <Skeleton lines={6} />;
  return <CatalogueResults page={page} onMore={() => void more()} loadingMore={loadingMore} />;
}

function CatalogueHeader(): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  return (
    <div class="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
      <div class="max-w-prose">
        <h1 class="text-h1 font-semibold">{t("catalogue.title")}</h1>
        <p class="mt-2 text-ink-2">{t("catalogue.intro")}</p>
      </div>
      <ButtonLink href={localizedPath(language, "/routes/new")}>{t("catalogue.write")}</ButtonLink>
    </div>
  );
}

/** Search, filters and cards; the filters live in the URL so a search can be shared. */
export function CataloguePage(): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const { url, route } = useLocation();
  const query = queryFromSearch(url.slice(url.indexOf("?") + 1));
  const services = useApi<Service[]>("/v1/services").state;
  const apply = (next: CatalogueQuery) => {
    route(`${localizedPath(language, "/routes")}${searchFromQuery(next)}`);
  };
  return (
    <Layout language={language}>
      <section class="py-12 md:py-16">
        <CatalogueHeader />
        <div class="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <div class="lg:border-r lg:border-rule lg:pr-8">
            <CatalogueFilters
              key={JSON.stringify(query)}
              query={query}
              services={services.status === "ready" ? services.data : []}
              onApply={apply}
            />
          </div>
          <section aria-labelledby="results-heading" class="min-w-0 lg:pl-8">
            <h2 id="results-heading" class="sr-only">
              {t("catalogue.resultsHeading")}
            </h2>
            <Results query={query} />
          </section>
        </div>
      </section>
    </Layout>
  );
}
