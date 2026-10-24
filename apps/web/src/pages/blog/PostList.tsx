import type { PostPage, PostSummary } from "@overpass/shared";
import { Newspaper } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, EmptyState } from "../../components/ui";
import { localizedPath } from "../../layout";
import { Cover } from "./Cover";
import { PostMeta } from "./PostMeta";

function Featured({ post }: { post: PostSummary }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  return (
    <article class="flex flex-col gap-3 border-b border-rule pb-8">
      <p class="m-0 text-caption font-semibold text-ink-2">{t("list.featured")}</p>
      <Cover src={post.cover} />
      <h2 class="m-0 text-h2 font-semibold [overflow-wrap:anywhere]">
        <a href={localizedPath(language, `/blog/${post.slug}`)}>{post.title}</a>
      </h2>
      <p class="m-0 max-w-prose text-body">{post.summary}</p>
      <PostMeta post={post} />
    </article>
  );
}

function PostRow({ post }: { post: PostSummary }): JSX.Element {
  const language = useLanguage();
  return (
    <li class="flex flex-col gap-4 border-b border-rule py-4 md:flex-row-reverse md:items-start">
      <Cover src={post.cover} small />
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <a
          class="text-h3 font-semibold [overflow-wrap:anywhere]"
          href={localizedPath(language, `/blog/${post.slug}`)}
        >
          {post.title}
        </a>
        <p class="m-0 max-w-prose text-ink-2">{post.summary}</p>
        <PostMeta post={post} />
      </div>
    </li>
  );
}

export type PostListProps = {
  page: PostPage;
  onMore: () => void;
  loadingMore?: boolean;
  featured?: boolean;
};

/** The first post leads when featured; the rest are ruled rows with a "show more" button. */
export function PostList(props: PostListProps): JSX.Element {
  const { page, onMore, loadingMore = false, featured = false } = props;
  const { t } = useTranslation("blog");
  const language = useLanguage();
  if (page.items.length === 0) {
    const write = (
      <ButtonLink href={localizedPath(language, "/blog/write")}>{t("list.write")}</ButtonLink>
    );
    const empty = { title: t("list.emptyTitle"), description: t("list.emptyText") };
    return <EmptyState icon={Newspaper} {...empty} action={write} />;
  }
  const [first, ...rest] = page.items;
  const rows = featured ? rest : page.items;
  return (
    <div class="flex flex-col gap-6">
      {featured && first !== undefined ? <Featured post={first} /> : null}
      {rows.length === 0 ? null : (
        <ul class="m-0 list-none border-t border-rule p-0">
          {rows.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </ul>
      )}
      {page.nextCursor === null ? null : (
        <Button class="self-start" onClick={onMore} loading={loadingMore}>
          {t("list.more")}
        </Button>
      )}
    </div>
  );
}
