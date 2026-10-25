import { searchKinds } from "@overpass/shared";
import type { Language, SearchGroup, SearchKind } from "@overpass/shared";
import { Search } from "lucide-preact";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { EmptyState, Skeleton } from "../../components/ui";
import { LoadError } from "../../forms";
import { Layout } from "../../layout";
import { useApi } from "../routes";
import { KindSection, pageSize } from "./KindSection";
import { searchApiPath, searchPagePath, searchParamsFrom } from "./query";
import type { SearchParams } from "./query";
import { SearchFilters } from "./SearchFilters";
import { minLength } from "./usePreview";

type Groups = Partial<Record<SearchKind, SearchGroup>>;

function Results({ params, language }: { params: SearchParams; language: Language }) {
  const { t } = useTranslation("search");
  const path = searchApiPath(params, language, { limit: pageSize });
  const { state, reload } = useApi<Groups>(params.q.length < minLength ? null : path);
  if (params.q.length < minLength) return <p class="m-0 text-ink-2">{t("page.start")}</p>;
  if (state.status === "loading" || state.status === "notFound") return <Skeleton lines={6} />;
  if (state.status === "error")
    return <LoadError error={state.error} onRetry={() => void reload()} />;
  const kinds = searchKinds.filter((kind) => (state.data[kind]?.items.length ?? 0) > 0);
  if (kinds.length === 0) {
    const title = t("dialog.empty", { q: params.q });
    return <EmptyState icon={Search} title={title} description={t("dialog.emptyHelp")} level={2} />;
  }
  return (
    <div class="flex flex-col gap-10">
      {kinds.map((kind) => {
        const first = state.data[kind] ?? { items: [], nextCursor: null };
        return <KindSection key={`${path}-${kind}`} {...{ kind, first, params, language }} />;
      })}
    </div>
  );
}

/** Filters in the URL so a search can be shared; results grouped by kind, each with more pages. */
export function SearchPage(): JSX.Element {
  const { t } = useTranslation("search");
  const language = useLanguage();
  const { url, route } = useLocation();
  const params = searchParamsFrom(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
  return (
    <Layout language={language}>
      <section class="py-12 md:py-16">
        <h1 class="m-0 text-h1 font-semibold">{t("page.title")}</h1>
        <p class="m-0 mt-3 max-w-[72ch] text-ink-2">{t("page.intro")}</p>
        <div class="mt-8 grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
          <SearchFilters
            key={url}
            params={params}
            onApply={(next) => {
              route(searchPagePath(language, next));
            }}
          />
          <div class="min-w-0" aria-live="polite">
            <Results params={params} language={language} />
          </div>
        </div>
      </section>
    </Layout>
  );
}
