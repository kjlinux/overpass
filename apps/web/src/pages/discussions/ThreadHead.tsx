import { countryName, languageNames } from "@overpass/shared";
import type { ThreadDetail } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Chip } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate, stackName } from "../routes";

function Fact({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="min-w-0 border-b border-rule px-2 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:first:pl-0 lg:last:border-r-0">
      <dt class="text-caption font-medium text-ink-2">{label}</dt>
      <dd class="m-0 font-semibold [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function Facts({ thread, topic }: { thread: ThreadDetail; topic: string }): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const author =
    thread.author === "" ? (
      t("deletedAuthor")
    ) : (
      <a href={localizedPath(language, `/members/${thread.author}`)}>{thread.author}</a>
    );
  return (
    <dl class="m-0 grid grid-cols-2 border-y border-rule sm:grid-cols-3 lg:grid-cols-6">
      <Fact label={t("facts.topic")}>{topic}</Fact>
      <Fact label={t("facts.author")}>{author}</Fact>
      <Fact label={t("facts.date")}>{formatDate(thread.createdAt, language)}</Fact>
      <Fact label={t("facts.language")}>{languageNames[thread.language]}</Fact>
      {thread.country === null ? null : (
        <Fact label={t("facts.country")}>{countryName(thread.country, language)}</Fact>
      )}
      {thread.stack === null ? null : (
        <Fact label={t("facts.stack")}>{stackName(thread.stack)}</Fact>
      )}
    </dl>
  );
}

type Props = { thread: ThreadDetail; topic: string };

function Trail({ thread, topic }: Props): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const list = localizedPath(language, "/discussions");
  return (
    <nav aria-label={t("detail.trail")} class="text-caption text-ink-2">
      <ol class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li>
          <a class="text-ink-2" href={list}>
            {t("list.title")}
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a class="text-ink-2" href={`${list}?topic=${thread.topic}`}>
            {topic}
          </a>
        </li>
      </ol>
    </nav>
  );
}

/** Trail, state, title, the route the question is about, and the facts strip. */
export function ThreadHead({ thread, topic }: Props): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  return (
    <header class="pb-6 pt-6">
      <Trail thread={thread} topic={topic} />
      <div class="mt-4">
        <Chip selected={thread.state === "resolved"}>{t(`state.${thread.state}`)}</Chip>
      </div>
      <h1 class="mt-3 max-w-[32ch] text-h1 font-semibold [overflow-wrap:anywhere]">
        {thread.title}
      </h1>
      {thread.route === null ? null : (
        <p class="mt-4 max-w-prose">
          {t("detail.aboutRoute", { service: thread.service?.name ?? "" })}{" "}
          <a href={localizedPath(language, `/routes/${thread.route.id}`)}>{thread.route.title}</a>
        </p>
      )}
      <div class="mt-6">
        <Facts thread={thread} topic={topic} />
      </div>
    </header>
  );
}
