import type { PostSummary } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { localizedPath } from "../../layout";
import { formatDate } from "../routes";

/** The author's blog link, unless the account is gone or the post is the team's news. */
export function AuthorLink({ post }: { post: PostSummary }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  if (post.author === null) {
    return <span>{post.kind === "news" ? t("team") : t("deletedAuthor")}</span>;
  }
  return <a href={localizedPath(language, `/blog/@${post.author.handle}`)}>{post.author.handle}</a>;
}

/** Author, date, category, stars and comments on one wrapping line. */
export function PostMeta({ post }: { post: PostSummary }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  return (
    <p class="m-0 flex flex-wrap gap-x-2 text-caption text-ink-2 [overflow-wrap:anywhere]">
      <AuthorLink post={post} />
      <span aria-hidden="true">·</span>
      {post.publishedAt === null ? (
        <span>{t(`status.${post.status}`)}</span>
      ) : (
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, language)}</time>
      )}
      <span aria-hidden="true">·</span>
      <span>{t(`categories.${post.category}`)}</span>
      <span aria-hidden="true">·</span>
      <span>{t("list.stars", { count: post.stars })}</span>
      <span aria-hidden="true">·</span>
      <span>{t("list.comments", { count: post.comments })}</span>
    </p>
  );
}
