import type { Reply } from "@overpass/shared";
import { Check, ThumbsUp } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Chip } from "../../components/ui";
import { localizedPath } from "../../layout";
import { Markdown } from "../../markdown";
import { formatDate } from "../routes";

export type ReplyPermissions = { signedIn: boolean; isThreadAuthor: boolean; open: boolean };

export type ReplyItemProps = {
  reply: Reply;
  can: ReplyPermissions;
  busy: boolean;
  onVote: () => void;
  onAccept: () => void;
  onReport: () => void;
};

function Author({ reply }: { reply: Reply }): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const name =
    reply.author === "" ? (
      t("deletedAuthor")
    ) : (
      <a href={localizedPath(language, `/members/${reply.author}`)}>{reply.author}</a>
    );
  return (
    <p class="m-0 flex flex-wrap items-center gap-2 text-caption text-ink-2">
      <span class="font-semibold text-ink">{name}</span>
      <time dateTime={reply.createdAt}>{formatDate(reply.createdAt, language)}</time>
      {reply.accepted ? <Chip selected>{t("reply.accepted")}</Chip> : null}
    </p>
  );
}

/** Voting is one click per account; the count stays visible when the button is not offered. */
function Actions(props: ReplyItemProps): JSX.Element {
  const { reply, can, busy } = props;
  const { t } = useTranslation("discussions");
  const canVote = can.signedIn && !reply.viewer.isAuthor && !reply.viewer.voted;
  const useful = t("reply.useful", { count: reply.useful });
  return (
    <div class="flex flex-wrap items-center gap-2">
      {canVote ? (
        <Button variant="secondary" onClick={props.onVote} disabled={busy}>
          <ThumbsUp class="h-5 w-5" aria-hidden="true" />
          {useful}
        </Button>
      ) : (
        <span class="inline-flex min-h-tap items-center gap-2 text-ink-2">
          <ThumbsUp class="h-5 w-5" aria-hidden="true" />
          {reply.viewer.voted ? t("reply.voted", { count: reply.useful }) : useful}
        </span>
      )}
      {can.isThreadAuthor && !reply.accepted && can.open ? (
        <Button variant="ghost" onClick={props.onAccept} disabled={busy}>
          <Check class="h-5 w-5" aria-hidden="true" />
          {t("reply.accept")}
        </Button>
      ) : null}
      {can.signedIn && !reply.viewer.isAuthor && !reply.viewer.reported ? (
        <Button variant="ghost" onClick={props.onReport} disabled={busy}>
          {t("reply.report")}
        </Button>
      ) : null}
    </div>
  );
}

export function ReplyItem(props: ReplyItemProps): JSX.Element {
  const { reply } = props;
  const { t } = useTranslation("discussions");
  const accepted = reply.accepted ? "border-l-4 border-l-accent pl-4" : "";
  return (
    <li
      id={`reply-${reply.id}`}
      class={`flex flex-col gap-3 border-b border-rule py-6 ${accepted}`}
    >
      <Author reply={reply} />
      {reply.content === null ? (
        <p class="text-ink-2">
          {t(reply.status === "removed" ? "hidden.removed" : "hidden.reply")}
        </p>
      ) : (
        <div class="max-w-prose">
          <Markdown source={reply.content} />
        </div>
      )}
      {reply.status === "visible" ? <Actions {...props} /> : null}
    </li>
  );
}
