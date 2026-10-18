import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, Field, Textarea } from "../../components/ui";
import { FormAlert } from "../../forms";
import { localizedPath } from "../../layout";
import { useSession } from "../../session";
import { createReply } from "./api";

function SignInPrompt({ url }: { url: string }): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const signInHref = `${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`;

  return (
    <div class="border border-rule bg-paper p-6 text-center">
      <p class="text-body text-ink-2 mb-4">{t("detail.signInToReply")}</p>
      <ButtonLink variant="primary" href={signInHref}>
        {t("signIn", { ns: "layout" })}
      </ButtonLink>
    </div>
  );
}

function useReplySubmit(threadId: string, onReplyAdded: () => void) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await createReply(threadId, content.trim());
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setContent("");
      onReplyAdded();
    }
  };

  return { content, setContent, submitting, error, submit };
}

function ReplySubmitButton({ submitting }: { submitting: boolean }): JSX.Element {
  const { t } = useTranslation("discussions");
  return (
    <div>
      <Button variant="primary" type="submit" loading={submitting} disabled={submitting}>
        {submitting ? t("detail.submittingReply") : t("detail.submitReply")}
      </Button>
    </div>
  );
}

type Props = {
  threadId: string;
  onReplyAdded: () => void;
};

export function ReplyComposer({ threadId, onReplyAdded }: Props): JSX.Element {
  const { t } = useTranslation("discussions");
  const { me } = useSession();
  const { url } = useLocation();
  const { content, setContent, submitting, error, submit } = useReplySubmit(threadId, onReplyAdded);

  if (!me) return <SignInPrompt url={url} />;

  return (
    <form
      class="flex flex-col gap-4 border border-rule bg-paper p-6"
      onSubmit={(e) => {
        void submit(e);
      }}
    >
      <h3 class="text-h3 font-bold text-ink">{t("detail.addReplyTitle")}</h3>
      {error && <FormAlert error={error} />}
      <Field id="reply-content" label={t("detail.addReplyTitle")} help={t("new.markdownHelp")}>
        {(ctrl) => (
          <Textarea
            {...ctrl}
            rows={5}
            value={content}
            placeholder={t("detail.replyPlaceholder")}
            onInput={(e) => {
              setContent((e.target as HTMLTextAreaElement).value);
            }}
            required
            minLength={3}
          />
        )}
      </Field>
      <ReplySubmitButton submitting={submitting} />
    </form>
  );
}
