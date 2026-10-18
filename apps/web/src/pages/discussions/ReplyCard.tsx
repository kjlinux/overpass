import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button } from "../../components/ui";
import { Markdown } from "../../markdown";
import { formatDate } from "../routes/format";
import type { ReplyItem } from "./types";

type Props = {
  reply: ReplyItem;
  isThreadAuthor: boolean;
  isAccepted: boolean;
  hasAcceptedReply: boolean;
  onVote: (replyId: string) => void;
  onAccept: (replyId: string) => void;
  voting: boolean;
  accepting: boolean;
};

function ReplyHeader({
  reply,
  isAccepted,
}: {
  reply: ReplyItem;
  isAccepted: boolean;
}): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();

  return (
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3 text-caption text-ink-2">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-ink">{reply.author.handle}</span>
        <span aria-hidden="true">&bull;</span>
        <time dateTime={reply.createdAt}>{formatDate(reply.createdAt, language)}</time>
      </div>
      {isAccepted && (
        <span class="inline-flex min-h-7 items-center border border-success bg-success-surface px-2.5 text-caption font-semibold text-success">
          {t("detail.acceptedAnswer")}
        </span>
      )}
    </div>
  );
}

function ReplyActions({
  reply,
  isThreadAuthor,
  hasAcceptedReply,
  onVote,
  onAccept,
  voting,
  accepting,
}: Omit<Props, "isAccepted">): JSX.Element {
  const { t } = useTranslation("discussions");
  const voteCount = String(reply.usefulVotes);

  return (
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3">
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            onVote(reply.id);
          }}
          disabled={voting}
          aria-label={`${t("detail.voteUseful")} (${voteCount})`}
        >
          {t("detail.voteUseful")} ({voteCount})
        </Button>
      </div>

      {isThreadAuthor && !hasAcceptedReply && (
        <Button
          variant="secondary"
          onClick={() => {
            onAccept(reply.id);
          }}
          loading={accepting}
          disabled={accepting}
        >
          {accepting ? t("detail.accepting") : t("detail.acceptAction")}
        </Button>
      )}
    </div>
  );
}

export function ReplyCard(props: Props): JSX.Element {
  const { reply, isAccepted } = props;

  return (
    <div
      class={`flex flex-col gap-4 border p-5 bg-paper transition-colors ${
        isAccepted ? "border-success bg-success-surface/20" : "border-rule"
      }`}
    >
      <ReplyHeader reply={reply} isAccepted={isAccepted} />
      <div class="text-body text-ink">
        <Markdown source={reply.content} />
      </div>
      <ReplyActions {...props} />
    </div>
  );
}
