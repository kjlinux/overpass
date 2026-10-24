import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { localizedPath } from "../../layout";
import { SubscribeForm } from "../../newsletter";
import { formatDate } from "../../pages/routes/format";
import { sectionClass } from "../SectionHead";
import { latestView } from "./latest";
import type { LatestState } from "./latest";
import { useLatest } from "./useLatest";

type Line = { key: string; title: string; path: string; author: string; date: string | null };

type ColumnProps = {
  kind: "threads" | "posts";
  state: LatestState<Line>;
  language: Language;
  ruled?: boolean;
};

function Column({ kind, state, language, ruled }: ColumnProps): JSX.Element | null {
  const { t } = useTranslation("home");
  const view = latestView(state);
  if (view.kind === "hidden") return null;
  const date = (iso: string | null) => (iso === null ? "" : formatDate(iso, language));
  return (
    <div class={`py-6 ${ruled === true ? "lg:border-l lg:border-rule lg:px-8" : "lg:pr-8"}`}>
      <h3 class="text-h3 font-semibold">{t(`latest.${kind}.title`)}</h3>
      {view.kind === "loading" ? (
        <div
          aria-busy="true"
          aria-label={t(`latest.${kind}.loading`)}
          class="skeleton-bar mt-4 h-32"
        />
      ) : (
        <ul class="mt-2">
          {view.items.map((line) => (
            <li key={line.key} class="border-b border-rule py-3">
              <a
                class="font-medium [overflow-wrap:anywhere]"
                href={localizedPath(language, line.path)}
              >
                {line.title}
              </a>
              <p class="text-caption text-ink-2">
                {t("latest.by", { author: line.author, date: date(line.date) })}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p class="mt-4">
        <a href={localizedPath(language, kind === "threads" ? "/discussions" : "/blog")}>
          {t(`latest.${kind}.all`)}
        </a>
      </p>
    </div>
  );
}

function asLines<T>(state: LatestState<T>, toLine: (item: T) => Line): LatestState<Line> {
  return state.status === "ready" ? { status: "ready", items: state.items.map(toLine) } : state;
}

/** What members wrote lately, then the weekly letter that sums it up. */
export function LatestActivity({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  const threads = asLines(useLatest("threads"), (thread) => ({
    key: thread.id,
    title: thread.title,
    path: `/discussions/${thread.id}`,
    author: thread.author,
    date: thread.createdAt,
  }));
  const posts = asLines(useLatest("posts"), (post) => ({
    key: post.id,
    title: post.title,
    path: `/blog/${post.slug}`,
    author: post.author?.handle ?? t("latest.team"),
    date: post.publishedAt,
  }));
  return (
    <section id="community" aria-labelledby="community-title" class={sectionClass}>
      <h2 id="community-title" class="py-6 text-h2 font-semibold">
        {t("latest.activity")}
      </h2>
      <div class="grid grid-cols-[minmax(0,1fr)] border-t border-rule lg:grid-cols-3">
        <Column kind="threads" state={threads} language={language} />
        <Column kind="posts" state={posts} language={language} ruled />
        <div class="py-6 lg:border-l lg:border-rule lg:pl-8">
          <p class="mb-4">{t("latest.newsletter")}</p>
          <SubscribeForm language={language} variant="footer" />
        </div>
      </div>
    </section>
  );
}
