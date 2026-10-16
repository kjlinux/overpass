import type { ThreadPage, ThreadSummary } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { localizedPath } from "../../layout";
import { formatDate } from "./format";
import { useApi } from "./useApi";

const pageSize = 50;

function QuestionList(props: { heading: string; threads: ThreadSummary[]; empty: string }) {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  return (
    <div class="min-w-0">
      <h3 class="text-h3 font-semibold">{props.heading}</h3>
      {props.threads.length === 0 ? (
        <p class="mt-2 text-ink-2">{props.empty}</p>
      ) : (
        <ul class="m-0 mt-2 list-none border-t border-rule p-0">
          {props.threads.map((thread) => (
            <li key={thread.id} class="flex flex-col gap-1 border-b border-rule py-3">
              <a
                class="font-semibold [overflow-wrap:anywhere]"
                href={localizedPath(language, `/discussions/${thread.id}`)}
              >
                {thread.title}
              </a>
              <span class="text-caption text-ink-2">
                {t("questions.meta", {
                  count: thread.replies,
                  date: formatDate(thread.lastActivityAt, language),
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The questions members asked about this route, open ones first. */
export function RouteQuestions({ routeId }: { routeId: string }): JSX.Element {
  const { t } = useTranslation("routes");
  const { state } = useApi<ThreadPage>(`/v1/threads?route=${routeId}&limit=${String(pageSize)}`);
  const threads = state.status === "ready" ? state.data.items : [];
  return (
    <section aria-labelledby="questions-heading" class="max-w-prose border-t border-rule py-8">
      <h2 id="questions-heading" class="text-h2 font-semibold">
        {t("questions.heading")}
      </h2>
      <div class="mt-4 grid gap-6">
        <QuestionList
          heading={t("questions.open")}
          threads={threads.filter((thread) => thread.state === "open")}
          empty={t("questions.noneOpen")}
        />
        <QuestionList
          heading={t("questions.resolved")}
          threads={threads.filter((thread) => thread.state === "resolved")}
          empty={t("questions.noneResolved")}
        />
      </div>
    </section>
  );
}
