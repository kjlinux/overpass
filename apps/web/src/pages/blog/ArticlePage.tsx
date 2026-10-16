import type { ApiError, CommentPage, PostDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout } from "../../layout";
import { SubscribeForm } from "../../newsletter";
import { apiRequest, useSession } from "../../session";
import { ErrorPage } from "../errors";
import { useApi } from "../routes";
import { ArticleView } from "./ArticleView";
import type { ArticleActionsSet } from "./ArticleView";

const noComments: CommentPage = { items: [], nextCursor: null };

/** Every action reloads the post and its comments, so counts are always the server's. */
function useActions(post: PostDetail, reload: () => Promise<void>): ArticleActionsSet {
  const then = async (call: Promise<{ error: ApiError | null }>) => {
    const { error } = await call;
    if (error === null) await reload();
    return error ?? undefined;
  };
  const base = `/v1/posts/${post.id}`;
  return {
    star: () => then(apiRequest("POST", `${base}/star`, {})),
    unstar: () => then(apiRequest("DELETE", `${base}/star`)),
    comment: (content) => then(apiRequest("POST", `${base}/comments`, { content })),
    report: (kind, id) =>
      then(apiRequest("POST", `/v1/${kind === "post" ? "posts" : "comments"}/${id}/reports`, {})),
  };
}

function Loaded(props: { post: PostDetail; reload: () => Promise<void> }) {
  const { me } = useSession();
  const language = useLanguage();
  const comments = useApi<CommentPage>(`/v1/posts/${props.post.id}/comments`);
  const reload = async () => {
    await Promise.all([props.reload(), comments.refresh()]);
  };
  const actions = useActions(props.post, reload);
  const page = comments.state.status === "ready" ? comments.state.data : noComments;
  return (
    <ArticleView
      post={props.post}
      comments={page}
      signedIn={me != null}
      actions={actions}
      newsletter={<SubscribeForm language={language} variant="compact" />}
    />
  );
}

export function ArticlePage({ slug }: { slug: string }): JSX.Element {
  const { t } = useTranslation("ui");
  const language = useLanguage();
  const { state, reload, refresh } = useApi<PostDetail>(`/v1/posts/${slug}?lang=${language}`);
  if (state.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  return (
    <Layout language={language}>
      {state.status === "loading" ? (
        <div class="mx-auto max-w-prose py-12">
          <Skeleton lines={8} />
        </div>
      ) : null}
      {state.status === "ready" ? <Loaded post={state.data} reload={refresh} /> : null}
      {state.status === "error" ? (
        <div class="flex flex-col items-start gap-4 py-12">
          <FormAlert error={state.error} />
          <Button onClick={() => void reload()}>{t("retry")}</Button>
        </div>
      ) : null}
    </Layout>
  );
}
