import type { ApiError, Reply, ThreadDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import { LoadError } from "../../forms";
import { ReplyForm } from "./ReplyForm";
import { ReplyItem } from "./ReplyItem";
import { shownReplies } from "./replyPages";
import type { ReplyPagesView } from "./replyPages";
import type { ThreadActions } from "./ThreadView";

export type RepliesProps = {
  thread: ThreadDetail;
  signedIn: boolean;
  actions: ThreadActions;
  pages: ReplyPagesView;
  run: (call: Promise<ApiError | undefined>) => void;
  busy: boolean;
};

function ReplyList(props: RepliesProps): JSX.Element {
  const { thread, signedIn, actions, run, busy } = props;
  const can = {
    signedIn,
    isThreadAuthor: thread.viewer.isAuthor,
    open: thread.status === "visible",
  };
  const pinned = thread.accepted === null ? [] : [thread.accepted];
  const item = (reply: Reply) => (
    <ReplyItem
      key={reply.id}
      reply={reply}
      can={can}
      busy={busy}
      onVote={() => {
        run(actions.vote(reply.id));
      }}
      onAccept={() => {
        run(actions.accept(reply.id));
      }}
      onReport={() => {
        run(actions.report("reply", reply.id));
      }}
    />
  );
  return (
    <ul class="m-0 mt-4 list-none p-0">
      {[...pinned, ...shownReplies(thread, props.pages.extra)].map(item)}
    </ul>
  );
}

/** A failed page keeps the loaded replies and turns the button into a retry. */
function More({ pages }: { pages: ReplyPagesView }): JSX.Element | null {
  const { t } = useTranslation("discussions");
  if (pages.error !== undefined) {
    return (
      <div class="mt-4">
        <LoadError error={pages.error} onRetry={pages.onMore} />
      </div>
    );
  }
  if (pages.next === null) return null;
  return (
    <Button class="mt-4" loading={pages.loading} onClick={pages.onMore}>
      {t("detail.more")}
    </Button>
  );
}

/** The accepted reply first, then the others oldest first, page after page. */
export function Replies(props: RepliesProps): JSX.Element {
  const { thread, signedIn, actions } = props;
  const { t } = useTranslation("discussions");
  return (
    <section aria-labelledby="replies-heading" class="border-t border-rule pt-8">
      <h2 id="replies-heading" class="text-h2 font-semibold">
        {t("detail.replies", { count: thread.listed })}
      </h2>
      <ReplyList {...props} />
      <More pages={props.pages} />
      {thread.status === "visible" ? (
        <div class="mt-8 max-w-prose">
          <ReplyForm signedIn={signedIn} onSend={actions.reply} />
        </div>
      ) : null}
    </section>
  );
}
