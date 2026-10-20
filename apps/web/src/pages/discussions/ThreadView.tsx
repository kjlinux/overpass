import type { ApiError, ContentKind, ThreadDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, CodeBlock } from "../../components/ui";
import { FormAlert } from "../../forms";
import { localizedPath } from "../../layout";
import { Markdown } from "../../markdown";
import { Replies } from "./ReplyList";
import type { ReplyPagesView } from "./replyPages";
import { ThreadHead } from "./ThreadHead";

export type ThreadActions = {
  reply: (content: string) => Promise<ApiError | undefined>;
  vote: (replyId: string) => Promise<ApiError | undefined>;
  accept: (replyId: string) => Promise<ApiError | undefined>;
  report: (kind: ContentKind, id: string) => Promise<ApiError | undefined>;
};

export type ThreadViewProps = {
  thread: ThreadDetail;
  topic: string;
  signedIn: boolean;
  actions: ThreadActions;
  pages: ReplyPagesView;
};

/** Turning into a route is the page's one primary action, offered to the author once resolved. */
function MainAction({ thread }: { thread: ThreadDetail }): JSX.Element | null {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  if (thread.transformedRoute !== null) {
    const href = localizedPath(language, `/routes/${thread.transformedRoute}`);
    return <ButtonLink href={href}>{t("detail.seeRoute")}</ButtonLink>;
  }
  if (!thread.viewer.canTransform) return null;
  const href = localizedPath(language, `/routes/new?fromThread=${thread.id}`);
  return (
    <div class="flex flex-col gap-2">
      <ButtonLink variant="primary" class="w-full" href={href}>
        {t("detail.transform")}
      </ButtonLink>
      <p class="text-caption text-ink-2">{t("detail.transformNote")}</p>
    </div>
  );
}

function Rail(props: ThreadViewProps & { failure: ApiError | undefined; onReport: () => void }) {
  const { thread, signedIn } = props;
  const { t } = useTranslation("discussions");
  const canReport = signedIn && !thread.viewer.isAuthor && !thread.viewer.reported;
  return (
    <aside
      aria-label={t("detail.actions")}
      class="flex flex-col gap-4 border-b border-rule py-6 lg:col-start-2 lg:row-start-1 lg:border-b-0 lg:border-l lg:py-8 lg:pl-8"
    >
      <MainAction thread={thread} />
      {canReport ? (
        <Button variant="ghost" class="self-start" onClick={props.onReport}>
          {t("detail.report")}
        </Button>
      ) : null}
      {thread.viewer.reported ? (
        <p class="text-caption text-ink-2">{t("detail.reported")}</p>
      ) : null}
      <FormAlert error={props.failure} />
    </aside>
  );
}

function Question({ thread }: { thread: ThreadDetail }): JSX.Element {
  const { t } = useTranslation("discussions");
  if (thread.content === null) return <p class="text-ink-2">{t("hidden.thread")}</p>;
  return (
    <div class="flex max-w-prose flex-col gap-6">
      <Markdown source={thread.content} />
      {thread.errorText === null ? null : (
        <CodeBlock code={thread.errorText} language={t("form.errorCaption")} />
      )}
      {thread.codeText === null ? null : (
        <CodeBlock code={thread.codeText} language={t("form.codeCaption")} />
      )}
    </div>
  );
}

/** The question, its replies and the reply form; actions reload the thread from the API. */
export function ThreadView(props: ThreadViewProps): JSX.Element {
  const [failure, setFailure] = useState<ApiError | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const run = (call: Promise<ApiError | undefined>) => {
    setBusy(true);
    void call.then((error) => {
      setBusy(false);
      setFailure(error);
    });
  };
  return (
    <article>
      <ThreadHead thread={props.thread} topic={props.topic} />
      <div class="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <Rail
          {...props}
          failure={failure}
          onReport={() => {
            run(props.actions.report("thread", props.thread.id));
          }}
        />
        <div class="flex min-w-0 flex-col gap-8 py-8 lg:col-start-1 lg:row-start-1 lg:pr-12">
          <Question thread={props.thread} />
          <Replies {...props} run={run} busy={busy} />
        </div>
      </div>
    </article>
  );
}
