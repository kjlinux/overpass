import { postCategories, postFeeds } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { cx } from "../../components/ui";
import { localizedPath } from "../../layout";
import { blogSearch } from "./query";
import type { BlogQuery } from "./query";

const linkClass = (current: boolean) =>
  cx(
    "inline-flex min-h-tap items-center whitespace-nowrap border-b-2 px-3 font-medium",
    current ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink",
  );

/** Feeds are links, not tabs: each one has its own address and can be shared. */
export function FeedTabs({ query }: { query: BlogQuery }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const current = query.feed ?? "recent";
  return (
    <nav aria-label={t("feeds.label")} class="overflow-x-auto border-b border-rule">
      <ul class="m-0 flex list-none gap-2 p-0">
        {postFeeds.map((feed) => {
          const search = blogSearch({
            ...(feed === "recent" ? {} : { feed }),
            ...(query.category === undefined ? {} : { category: query.category }),
          });
          return (
            <li key={feed}>
              <a
                class={linkClass(feed === current)}
                href={`${localizedPath(language, "/blog")}${search}`}
                aria-current={feed === current ? "page" : undefined}
              >
                {t(`feeds.${feed}`)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Categories keep the chosen feed; "All" clears the category only. */
export function CategoryLinks({ query }: { query: BlogQuery }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const base = localizedPath(language, "/blog");
  const feedOnly = query.feed === undefined ? {} : { feed: query.feed };
  const choices = [undefined, ...postCategories];
  return (
    <nav aria-label={t("categories.label")}>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        {choices.map((category) => {
          const selected = query.category === category;
          const search = blogSearch(category === undefined ? feedOnly : { ...feedOnly, category });
          return (
            <li key={category ?? "all"}>
              <a
                href={`${base}${search}`}
                aria-current={selected ? "page" : undefined}
                class={cx(
                  "inline-flex min-h-tap items-center border px-3 text-caption font-medium",
                  selected
                    ? "border-accent bg-accent-surface text-ink"
                    : "border-rule-strong text-ink-2",
                )}
              >
                {t(category === undefined ? "categories.all" : `categories.${category}`)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
