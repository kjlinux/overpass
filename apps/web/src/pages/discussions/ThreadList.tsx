import { countryName } from "@overpass/shared";
import type { DiscussionTopic, ThreadPage, ThreadSummary } from "@overpass/shared";
import { MessagesSquare } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, Chip, EmptyState } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate, stackName } from "../routes";

type Names = Map<string, string>;

function Meta({ thread, topics }: { thread: ThreadSummary; topics: Names }): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const parts = [
    topics.get(thread.topic) ?? thread.topic,
    thread.author === "" ? t("deletedAuthor") : thread.author,
    thread.country === null ? null : countryName(thread.country, language),
    thread.stack === null ? null : stackName(thread.stack),
    t("list.replies", { count: thread.replies }),
  ].filter((part): part is string => part !== null);
  return <p class="m-0 text-caption text-ink-2 [overflow-wrap:anywhere]">{parts.join(" · ")}</p>;
}

function ThreadRow({ thread, topics }: { thread: ThreadSummary; topics: Names }): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4">
      <div class="flex flex-wrap items-center gap-2">
        <Chip selected={thread.state === "resolved"}>{t(`state.${thread.state}`)}</Chip>
        <time dateTime={thread.lastActivityAt} class="text-caption text-ink-2">
          {t("list.activity", { date: formatDate(thread.lastActivityAt, language) })}
        </time>
      </div>
      <a
        class="text-h3 font-semibold [overflow-wrap:anywhere]"
        href={localizedPath(language, `/discussions/${thread.id}`)}
      >
        {thread.title}
      </a>
      <Meta thread={thread} topics={topics} />
    </li>
  );
}

export type ThreadListProps = {
  page: ThreadPage;
  topics: DiscussionTopic[];
  onMore: () => void;
  loadingMore?: boolean;
};

/** One ruled row per thread, latest activity first; an empty search invites a new thread. */
export function ThreadList(props: ThreadListProps): JSX.Element {
  const { page, onMore, loadingMore = false } = props;
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const topics: Names = new Map(props.topics.map((topic) => [topic.slug, topic.name]));
  if (page.items.length === 0) {
    const open = (
      <ButtonLink href={localizedPath(language, "/discussions/new")}>{t("list.new")}</ButtonLink>
    );
    const empty = { title: t("list.emptyTitle"), description: t("list.emptyText") };
    return <EmptyState icon={MessagesSquare} {...empty} action={open} />;
  }
  return (
    <div class="flex flex-col gap-6">
      <ul class="m-0 list-none border-t border-rule p-0">
        {page.items.map((thread) => (
          <ThreadRow key={thread.id} thread={thread} topics={topics} />
        ))}
      </ul>
      {page.nextCursor === null ? null : (
        <Button class="self-start" onClick={onMore} loading={loadingMore}>
          {t("list.more")}
        </Button>
      )}
    </div>
  );
}
