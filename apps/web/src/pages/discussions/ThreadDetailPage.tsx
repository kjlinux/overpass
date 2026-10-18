import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Skeleton } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { useSession } from "../../session";
import { acceptReply, fetchThread, fetchTopics, voteReply } from "./api";
import { RepliesList } from "./RepliesList";
import { ReplyComposer } from "./ReplyComposer";
import { ThreadOriginalPost } from "./ThreadOriginalPost";
import type { ThreadDetail, Topic } from "./types";

function useThreadData(threadId: string) {
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    const [threadRes, topicsRes] = await Promise.all([fetchThread(threadId), fetchTopics()]);
    if (threadRes.data) setThread(threadRes.data);
    if (topicsRes.data) setTopics(topicsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [threadId]);

  const handleVote = async (replyId: string) => {
    setActionLoading(`vote-${replyId}`);
    const res = await voteReply(replyId);
    setActionLoading(null);
    if (res.data && thread) {
      const updated = thread.replies.map((rep) =>
        rep.id === replyId ? { ...rep, usefulVotes: res.data.usefulVotes } : rep,
      );
      setThread({ ...thread, replies: updated });
    }
  };

  const handleAccept = async (replyId: string) => {
    setActionLoading(`accept-${replyId}`);
    const res = await acceptReply(threadId, replyId);
    setActionLoading(null);
    if (res.data && thread) setThread({ ...thread, acceptedReplyId: replyId });
  };

  return { thread, topics, loading, actionLoading, loadData, handleVote, handleAccept };
}

function ThreadBackLink(): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  return (
    <div>
      <a
        href={localizedPath(language, "/discussions")}
        class="text-caption font-semibold text-accent hover:underline"
      >
        &larr; {t("detail.back")}
      </a>
    </div>
  );
}

type ContentProps = {
  threadId: string;
  thread: ThreadDetail;
  topics: Topic[];
  actionLoading: string | null;
  loadData: () => Promise<void>;
  handleVote: (id: string) => Promise<void>;
  handleAccept: (id: string) => Promise<void>;
};

function ThreadDetailContent({
  threadId,
  thread,
  topics,
  actionLoading,
  loadData,
  handleVote,
  handleAccept,
}: ContentProps): JSX.Element {
  const { me } = useSession();
  const isAuthor = Boolean(me && thread.author.id && me.id === thread.author.id);

  return (
    <div class="mx-auto max-w-4xl flex flex-col gap-6 py-6">
      <ThreadBackLink />
      <ThreadOriginalPost thread={thread} topics={topics} />
      <RepliesList
        thread={thread}
        isAuthor={isAuthor}
        actionLoading={actionLoading}
        onVote={(id) => {
          void handleVote(id);
        }}
        onAccept={(id) => {
          void handleAccept(id);
        }}
      />
      <ReplyComposer
        threadId={threadId}
        onReplyAdded={() => {
          void loadData();
        }}
      />
    </div>
  );
}

export function ThreadDetailPage(): JSX.Element {
  const language = useLanguage();
  const { params } = useRoute();
  const threadId = params["id"] ?? "";
  const data = useThreadData(threadId);

  return (
    <Layout language={language}>
      {data.loading || !data.thread ? (
        <div class="py-6">
          <Skeleton lines={8} />
        </div>
      ) : (
        <ThreadDetailContent
          threadId={threadId}
          thread={data.thread}
          topics={data.topics}
          actionLoading={data.actionLoading}
          loadData={data.loadData}
          handleVote={data.handleVote}
          handleAccept={data.handleAccept}
        />
      )}
    </Layout>
  );
}
