import { languageNames } from "@overpass/shared";
import type { Me, PostPage, PostSummary } from "@overpass/shared";
import { PenLine } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Chip, EmptyState, Skeleton } from "../../components/ui";
import { LoadError } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { RequireSession } from "../../session";
import { formatDate, useApi } from "../routes";

function statusOf(post: PostSummary): "draft" | "published" | "scheduled" {
  if (post.status === "draft") return "draft";
  return post.publishedAt !== null && new Date(post.publishedAt) > new Date()
    ? "scheduled"
    : "published";
}

function MinePost({ post }: { post: PostSummary }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4">
      <div class="flex flex-wrap gap-2">
        <Chip selected={statusOf(post) === "published"}>{t(`status.${statusOf(post)}`)}</Chip>
        {post.moderation === "visible" ? null : (
          <Chip>{t(`moderationStatus.${post.moderation}`)}</Chip>
        )}
        <Chip>{languageNames[post.language]}</Chip>
      </div>
      <a
        class="text-h3 font-semibold [overflow-wrap:anywhere]"
        href={localizedPath(language, `/blog/write/${post.id}`)}
      >
        {post.title}
      </a>
      <p class="m-0 text-caption text-ink-2">
        {post.publishedAt === null ? t("status.draft") : formatDate(post.publishedAt, language)}
      </p>
    </li>
  );
}

function MinePosts(): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { state, reload } = useApi<PostPage>("/v1/me/posts");
  if (state.status === "error") {
    return <LoadError error={state.error} onRetry={() => void reload()} />;
  }
  if (state.status !== "ready") return <Skeleton lines={5} />;
  if (state.data.items.length === 0) {
    const write = (
      <ButtonLink href={localizedPath(language, "/blog/write")}>{t("mine.new")}</ButtonLink>
    );
    return (
      <EmptyState
        icon={PenLine}
        title={t("mine.emptyTitle")}
        description={t("mine.emptyText")}
        action={write}
      />
    );
  }
  return (
    <ul class="m-0 list-none border-t border-rule p-0">
      {state.data.items.map((post) => (
        <MinePost key={post.id} post={post} />
      ))}
    </ul>
  );
}

function Mine({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  return (
    <section class="py-12 md:py-16">
      <div class="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
        <div class="max-w-prose">
          <h1 class="text-h1 font-semibold">{t("mine.title")}</h1>
          <p class="mt-2 text-ink-2">{t("mine.intro")}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <ButtonLink href={localizedPath(language, `/blog/@${me.handle}`)}>
            {t("mine.view")}
          </ButtonLink>
          <ButtonLink variant="primary" href={localizedPath(language, "/blog/write")}>
            {t("mine.new")}
          </ButtonLink>
        </div>
      </div>
      <div class="mt-8">
        <MinePosts />
      </div>
    </section>
  );
}

/** Drafts, scheduled and published posts of the signed-in member, newest change first. */
export function MyBlogPage(): JSX.Element {
  const language = useLanguage();
  return (
    <Layout language={language}>
      <RequireSession>{(me) => <Mine me={me} />}</RequireSession>
    </Layout>
  );
}
