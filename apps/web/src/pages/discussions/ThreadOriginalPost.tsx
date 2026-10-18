import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Chip } from "../../components/ui";
import { localizedPath } from "../../layout";
import { Markdown } from "../../markdown";
import { formatDate } from "../routes/format";
import type { ThreadDetail, Topic } from "./types";

type Props = {
  thread: ThreadDetail;
  topics: Topic[];
};

function ThreadOriginalHeader({
  thread,
  topic,
}: {
  thread: ThreadDetail;
  topic?: Topic | undefined;
}): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const newRouteParams = new URLSearchParams({
    title: thread.title,
    country: thread.country ?? "",
    stack: thread.stack ?? "",
  });

  return (
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
      <div class="flex flex-wrap items-center gap-2">
        {topic && <Chip selected>{topic.name}</Chip>}
        {thread.country && <Chip>{thread.country}</Chip>}
        {thread.stack && <Chip>{thread.stack}</Chip>}
        {thread.acceptedReplyId && (
          <span class="inline-flex min-h-7 items-center border border-success bg-success-surface px-2.5 text-caption font-semibold text-success">
            {t("card.accepted")}
          </span>
        )}
      </div>

      <ButtonLink
        variant="secondary"
        href={localizedPath(language, `/routes/new?${newRouteParams.toString()}`)}
      >
        {t("detail.transformToRoute")}
      </ButtonLink>
    </div>
  );
}

export function ThreadOriginalPost({ thread, topics }: Props): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const topic = topics.find((item) => item.id === thread.topicId);

  return (
    <article class="flex flex-col gap-4 border border-rule bg-paper p-6">
      <ThreadOriginalHeader thread={thread} topic={topic} />
      <h1 class="text-h2 font-bold tracking-tight text-ink">{thread.title}</h1>

      <div class="flex items-center gap-2 text-caption text-ink-2">
        <time dateTime={thread.createdAt}>
          {t("detail.author", {
            handle: thread.author.handle,
            date: formatDate(thread.createdAt, language),
          })}
        </time>
      </div>

      {thread.routeId && (
        <div class="border border-rule bg-surface p-3 text-caption text-ink">
          <a
            href={localizedPath(language, `/routes/${thread.routeId}`)}
            class="text-accent underline font-medium hover:text-accent-hover"
          >
            {t("detail.linkedRoute")}
          </a>
        </div>
      )}

      <div class="text-body text-ink pt-2">
        <Markdown source={thread.content} />
      </div>
    </article>
  );
}
