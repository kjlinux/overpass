import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { ReplyCard } from "./ReplyCard";
import type { ThreadDetail } from "./types";

type Props = {
  thread: ThreadDetail;
  isAuthor: boolean;
  actionLoading: string | null;
  onVote: (id: string) => void;
  onAccept: (id: string) => void;
};

export function RepliesList({
  thread,
  isAuthor,
  actionLoading,
  onVote,
  onAccept,
}: Props): JSX.Element {
  const { t } = useTranslation("discussions");

  return (
    <div class="flex flex-col gap-4">
      <h2 class="text-h3 font-bold text-ink">
        {t("detail.repliesTitle")} ({String(thread.replies.length)})
      </h2>
      {thread.replies.length === 0 ? (
        <p class="border border-dashed border-rule p-6 text-center text-ink-2">
          {t("detail.noReplies")}
        </p>
      ) : (
        thread.replies.map((reply) => (
          <ReplyCard
            key={reply.id}
            reply={reply}
            isThreadAuthor={isAuthor}
            isAccepted={thread.acceptedReplyId === reply.id}
            hasAcceptedReply={Boolean(thread.acceptedReplyId)}
            onVote={onVote}
            onAccept={onAccept}
            voting={actionLoading === `vote-${reply.id}`}
            accepting={actionLoading === `accept-${reply.id}`}
          />
        ))
      )}
    </div>
  );
}
