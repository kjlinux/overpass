import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Chip } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate } from "../routes/format";
import type { ThreadSummary, Topic } from "./types";

type Props = {
  thread: ThreadSummary;
  topics: Topic[];
};

export function ThreadCard({ thread, topics }: Props): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const topic = topics.find((item) => item.id === thread.topicId);

  return (
    <article class="flex flex-col gap-3 border border-rule bg-paper p-5 transition-colors hover:border-ink">
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

      <h2 class="text-h3 font-bold text-ink">
        <a
          href={localizedPath(language, `/discussions/${thread.id}`)}
          class="hover:text-accent hover:underline focus-visible:outline-accent"
        >
          {thread.title}
        </a>
      </h2>

      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3 text-caption text-ink-2">
        <div class="flex items-center gap-2">
          <span>{t("card.authorBy", { handle: thread.author.handle })}</span>
          <span aria-hidden="true">&bull;</span>
          <time dateTime={thread.createdAt}>{formatDate(thread.createdAt, language)}</time>
        </div>
        <span class="font-medium text-ink">
          {t("card.replies", { count: thread.repliesCount })}
        </span>
      </div>
    </article>
  );
}
