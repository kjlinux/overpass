import type { DiscussionTopic, ThreadPage } from "@overpass/shared";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { apiRequest } from "../../session";
import { useApi } from "../routes";
import { threadQueryFrom, threadSearch } from "./query";
import type { ThreadQuery } from "./query";
import { ThreadFilters } from "./ThreadFilters";
import { ThreadList } from "./ThreadList";

/** Keeps every loaded page, so "show more" appends instead of replacing. */
function useThreads(query: ThreadQuery) {
  const search = threadSearch(query);
  const { state, reload } = useApi<ThreadPage>(`/v1/threads${search}`);
  const [extra, setExtra] = useState<ThreadPage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setExtra(null);
  }, [search]);
  const page = state.status === "ready" ? (extra ?? state.data) : null;
  const more = async () => {
    if (page?.nextCursor == null) return;
    setLoadingMore(true);
    const next = await apiRequest<ThreadPage>(
      "GET",
      `/v1/threads${threadSearch(query, page.nextCursor)}`,
    );
    setLoadingMore(false);
    if (next.error === null)
      setExtra({ items: [...page.items, ...next.data.items], nextCursor: next.data.nextCursor });
  };
  return { state, reload, page, more, loadingMore };
}

function Results(props: { query: ThreadQuery; topics: DiscussionTopic[] }): JSX.Element {
  const { t } = useTranslation("ui");
  const { state, reload, page, more, loadingMore } = useThreads(props.query);
  if (state.status === "error") {
    return (
      <div class="flex flex-col items-start gap-4">
        <FormAlert error={state.error} />
        <Button onClick={() => void reload()}>{t("retry")}</Button>
      </div>
    );
  }
  if (page === null) return <Skeleton lines={6} />;
  return (
    <ThreadList
      page={page}
      topics={props.topics}
      onMore={() => void more()}
      loadingMore={loadingMore}
    />
  );
}

function Header(): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  return (
    <div class="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
      <div class="max-w-prose">
        <h1 class="text-h1 font-semibold">{t("list.title")}</h1>
      </div>
      <ButtonLink variant="primary" href={localizedPath(language, "/discussions/new")}>
        {t("list.new")}
      </ButtonLink>
    </div>
  );
}

/** Threads with their filters; the filters live in the URL so a search can be shared. */
export function ThreadsPage(): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const { url, route } = useLocation();
  const query = threadQueryFrom(url.slice(url.indexOf("?") + 1));
  const topics = useApi<DiscussionTopic[]>("/v1/topics").state;
  const list = topics.status === "ready" ? topics.data : [];
  const apply = (next: ThreadQuery) => {
    route(`${localizedPath(language, "/discussions")}${threadSearch(next)}`);
  };
  return (
    <Layout language={language}>
      <section class="py-12 md:py-16">
        <Header />
        <div class="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <div class="lg:border-r lg:border-rule lg:pr-8">
            <ThreadFilters
              key={JSON.stringify(query)}
              query={query}
              topics={list}
              onApply={apply}
            />
          </div>
          <section aria-labelledby="threads-heading" class="min-w-0 lg:pl-8">
            <h2 id="threads-heading" class="sr-only">
              {t("list.resultsHeading")}
            </h2>
            <Results query={query} topics={list} />
          </section>
        </div>
      </section>
    </Layout>
  );
}
