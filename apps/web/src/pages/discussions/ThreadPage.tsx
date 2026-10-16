import type { ApiError, DiscussionTopic, ThreadDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout } from "../../layout";
import { apiRequest, useSession } from "../../session";
import { ErrorPage } from "../errors";
import { useApi } from "../routes";
import type { ThreadActions } from "./ThreadView";
import { ThreadView } from "./ThreadView";

/** Every action reloads the thread, so votes, acceptance and moderation are the server's. */
function useActions(id: string, reload: () => Promise<void>): ThreadActions {
  const then = async (call: Promise<{ error: ApiError | null }>) => {
    const { error } = await call;
    if (error === null) await reload();
    return error ?? undefined;
  };
  return {
    reply: (content) => then(apiRequest("POST", `/v1/threads/${id}/replies`, { content })),
    vote: (replyId) => then(apiRequest("POST", `/v1/replies/${replyId}/useful`, {})),
    accept: (reply) => then(apiRequest("POST", `/v1/threads/${id}/accept`, { reply })),
    report: (kind, target) =>
      then(
        apiRequest(
          "POST",
          `/v1/${kind === "thread" ? "threads" : "replies"}/${target}/reports`,
          {},
        ),
      ),
  };
}

function Loaded(props: { thread: ThreadDetail; reload: () => Promise<void> }): JSX.Element {
  const { me } = useSession();
  const actions = useActions(props.thread.id, props.reload);
  const topics = useApi<DiscussionTopic[]>("/v1/topics").state;
  const topic =
    topics.status === "ready"
      ? (topics.data.find((item) => item.slug === props.thread.topic)?.name ?? props.thread.topic)
      : props.thread.topic;
  const signedIn = me !== null && me !== undefined;
  return <ThreadView thread={props.thread} topic={topic} signedIn={signedIn} actions={actions} />;
}

export function ThreadPage(): JSX.Element {
  const { t } = useTranslation("ui");
  const language = useLanguage();
  const { params } = useRoute();
  const { state, reload, refresh } = useApi<ThreadDetail>(`/v1/threads/${params["id"] ?? ""}`);
  if (state.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  return (
    <Layout language={language}>
      {state.status === "loading" ? (
        <div class="py-12">
          <Skeleton lines={8} />
        </div>
      ) : null}
      {state.status === "ready" ? <Loaded thread={state.data} reload={refresh} /> : null}
      {state.status === "error" ? (
        <div class="flex flex-col items-start gap-4 py-12">
          <FormAlert error={state.error} />
          <Button onClick={() => void reload()}>{t("retry")}</Button>
        </div>
      ) : null}
    </Layout>
  );
}
