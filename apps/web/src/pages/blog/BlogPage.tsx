import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { useSession } from "../../session";
import { CategoryLinks, FeedTabs } from "./FeedTabs";
import { Feed } from "./Feed";
import { blogQueryFrom, postsPath } from "./query";

function Header(): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { me } = useSession();
  return (
    <div class="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
      <div class="max-w-prose">
        <h1 class="text-h1 font-semibold">{t("list.title")}</h1>
      </div>
      <div class="flex flex-wrap gap-2">
        {me == null ? null : (
          <>
            <ButtonLink href={localizedPath(language, "/blog/me")}>{t("list.mine")}</ButtonLink>
            <ButtonLink href={localizedPath(language, "/blog/following")}>
              {t("list.following")}
            </ButtonLink>
          </>
        )}
        <ButtonLink variant="primary" href={localizedPath(language, "/blog/write")}>
          {t("list.write")}
        </ButtonLink>
      </div>
    </div>
  );
}

/** Feed and category live in the URL; the first post of the recent feed leads the page. */
export function BlogPage(): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { url } = useLocation();
  const query = blogQueryFrom(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
  const path = (cursor?: string) => postsPath(query, language, cursor);
  return (
    <Layout language={language}>
      <section class="py-12 md:py-16">
        <Header />
        <div class="mt-6 flex flex-col gap-4">
          <FeedTabs query={query} />
          <CategoryLinks query={query} />
          {query.feed === "forme" ? (
            <p class="m-0 text-caption text-ink-2">{t("list.formeHint")}</p>
          ) : null}
        </div>
        <section aria-labelledby="posts-heading" class="mt-8 min-w-0">
          <h2 id="posts-heading" class="sr-only">
            {t("list.resultsHeading")}
          </h2>
          <Feed path={path} featured={query.feed === undefined && query.category === undefined} />
        </section>
      </section>
    </Layout>
  );
}
