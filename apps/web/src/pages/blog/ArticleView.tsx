import { languageNames } from "@overpass/shared";
import type { ApiError, CommentPage, PostDetail, PostSummary } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { localizedPath } from "../../layout";
import { Markdown } from "../../markdown";
import { formatDate } from "../routes";
import { ArticleActions } from "./ArticleActions";
import { Comments } from "./Comments";
import type { CommentActions, CommentsFailure } from "./Comments";
import { AuthorLink } from "./PostMeta";

export type ArticleActionsSet = CommentActions & {
  star: () => Promise<ApiError | undefined>;
  unstar: () => Promise<ApiError | undefined>;
};

export type ArticleViewProps = {
  post: PostDetail;
  comments: CommentPage;
  signedIn: boolean;
  actions: ArticleActionsSet;
  newsletter?: ComponentChildren;
  onMoreComments?: () => void;
  loadingMoreComments?: boolean;
  commentsFailure?: CommentsFailure | undefined;
};

function Notice({ post }: { post: PostDetail }): JSX.Element | null {
  const { t } = useTranslation("blog");
  const key =
    post.moderation !== "visible"
      ? "article.hidden"
      : post.status === "draft"
        ? "article.draft"
        : null;
  if (key === null) return null;
  return <p class="m-0 border border-warning bg-warning-surface p-4">{t(key)}</p>;
}

function Byline({ post }: { post: PostDetail }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const other = post.translation;
  return (
    <p class="m-0 flex flex-wrap gap-x-2 text-ink-2">
      <span>
        {t("article.by")} <AuthorLink post={post} />
      </span>
      {post.publishedAt === null ? null : (
        <time dateTime={post.publishedAt}>
          {t("article.publishedOn", { date: formatDate(post.publishedAt, language) })}
        </time>
      )}
      {other === null ? null : (
        <a href={localizedPath(other.language, `/blog/${other.slug}`)} hrefLang={other.language}>
          {t("article.translation", { language: languageNames[other.language] })}
        </a>
      )}
    </p>
  );
}

function Related({ posts }: { posts: PostSummary[] }): JSX.Element | null {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" class="border-t border-rule pt-8">
      <h2 id="related-heading" class="m-0 text-h2 font-semibold">
        {t("article.related")}
      </h2>
      <ul class="m-0 mt-4 list-none p-0">
        {posts.map((item) => (
          <li key={item.id} class="border-b border-rule py-3">
            <a
              class="font-semibold [overflow-wrap:anywhere]"
              href={localizedPath(language, `/blog/${item.slug}`)}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleHeader({ post }: { post: PostDetail }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  return (
    <>
      <a href={localizedPath(language, "/blog")} class="self-start text-caption">
        {t("article.back")}
      </a>
      <Notice post={post} />
      <p class="m-0 text-caption font-semibold text-ink-2">
        {t(`categories.${post.category}`)} · {t(`kinds.${post.kind}`)}
      </p>
      <h1 class="m-0 text-h1 font-semibold [overflow-wrap:anywhere]">{post.title}</h1>
      <p class="m-0 text-h3 text-ink-2">{post.summary}</p>
      <Byline post={post} />
    </>
  );
}

/** One narrow column: title, byline, text, actions, comments, related posts, newsletter. */
export function ArticleView(props: ArticleViewProps): JSX.Element {
  const { post, comments, signedIn, actions, newsletter } = props;
  const { t } = useTranslation("blog");
  const more = props.onMoreComments === undefined ? {} : { onMore: props.onMoreComments };
  return (
    <article class="mx-auto flex max-w-prose flex-col gap-6 py-12 md:py-16">
      <ArticleHeader post={post} />
      <ArticleActions
        post={post}
        signedIn={signedIn}
        star={actions.star}
        unstar={actions.unstar}
        report={() => actions.report("post", post.id)}
      />
      <Markdown source={post.content} />
      <Comments
        page={comments}
        signedIn={signedIn}
        actions={actions}
        {...more}
        loadingMore={props.loadingMoreComments ?? false}
        failure={props.commentsFailure}
      />
      <Related posts={post.related} />
      {newsletter === undefined ? null : (
        <section aria-label={t("article.newsletter")} class="border-t border-rule pt-8">
          {newsletter}
        </section>
      )}
    </article>
  );
}
