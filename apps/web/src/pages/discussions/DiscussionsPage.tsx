import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, EmptyState, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { networkErrorCode } from "../../session";
import { fetchThreads, fetchTopics } from "./api";
import { DiscussionsFilters } from "./DiscussionsFilters";
import { ThreadCard } from "./ThreadCard";
import type { DiscussionsFilterState, ThreadSummary, Topic } from "./types";

function DiscussionsHeader(): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  return (
    <div class="flex flex-col gap-4 border-b border-rule pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-h1 font-bold tracking-tight text-ink">{t("title")}</h1>
        <p class="mt-1 text-body text-ink-2 max-w-prose">{t("subtitle")}</p>
      </div>
      <div>
        <ButtonLink variant="primary" href={localizedPath(language, "/discussions/new")}>
          {t("newThread")}
        </ButtonLink>
      </div>
    </div>
  );
}

function ThreadsList({
  threads,
  topics,
  loading,
}: {
  threads: ThreadSummary[];
  topics: Topic[];
  loading: boolean;
}): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();

  if (loading) {
    return <Skeleton lines={6} />;
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        title={t("empty.title")}
        description={t("empty.description")}
        action={
          <ButtonLink variant="secondary" href={localizedPath(language, "/discussions/new")}>
            {t("empty.action")}
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div class="flex flex-col gap-4">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} topics={topics} />
      ))}
    </div>
  );
}

function useDiscussionsData(topicId: string) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [topicsRes, threadsRes] = await Promise.all([
      fetchTopics(),
      fetchThreads({ topicId: topicId || undefined }),
    ]);

    if (topicsRes.error) {
      setError(topicsRes.error.message);
    } else if (threadsRes.error) {
      setError(threadsRes.error.message);
    } else {
      setTopics(topicsRes.data);
      setThreads(threadsRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [topicId]);

  return { topics, threads, loading, error, reload: loadData };
}

export function DiscussionsPage(): JSX.Element {
  const { t } = useTranslation(["discussions", "ui"]);
  const language = useLanguage();
  const [filters, setFilters] = useState<DiscussionsFilterState>({
    topicId: "",
    country: "",
    stack: "",
  });
  const { topics, threads, loading, error, reload } = useDiscussionsData(filters.topicId);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (filters.country && thread.country !== filters.country) return false;
      if (filters.stack && thread.stack !== filters.stack) return false;
      return true;
    });
  }, [threads, filters.country, filters.stack]);

  return (
    <Layout language={language}>
      <div class="flex flex-col gap-6 py-6">
        <DiscussionsHeader />
        <DiscussionsFilters topics={topics} filters={filters} onChange={setFilters} />
        {error && (
          <div class="flex flex-col items-start gap-4">
            <FormAlert error={{ code: networkErrorCode, message: error }} />
            <Button onClick={() => void reload()}>{t("retry", { ns: "ui" })}</Button>
          </div>
        )}
        <ThreadsList threads={filteredThreads} topics={topics} loading={loading} />
      </div>
    </Layout>
  );
}
