import { redactSecrets, replyCreateInput } from "@overpass/shared";
import type { ApiError } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink } from "../../components/ui";
import { FormAlert, useForm } from "../../forms";
import { localizedPath } from "../../layout";
import { useState } from "preact/hooks";
import { TextAreaField } from "./TextAreaField";

export type ReplyFormProps = {
  signedIn: boolean;
  onSend: (content: string) => Promise<ApiError | undefined>;
};

function SignInToReply(): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const { url } = useLocation();
  const href = `${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`;
  return <ButtonLink href={href}>{t("reply.signIn")}</ButtonLink>;
}

/** Secrets pasted in a reply are masked too; the form says so before sending. */
export function ReplyForm({ signedIn, onSend }: ReplyFormProps): JSX.Element {
  const { t } = useTranslation("discussions");
  const form = useForm(replyCreateInput, { content: "" });
  const [busy, setBusy] = useState(false);
  if (!signedIn) return <SignInToReply />;
  const found = redactSecrets(form.values["content"] ?? "").found;
  const onSubmit = async (event: Event) => {
    event.preventDefault();
    const data = form.validate();
    if (data === undefined || busy) return;
    setBusy(true);
    const error = await onSend(data.content);
    setBusy(false);
    if (error === undefined) form.setValues({ content: "" });
    else form.showApiError(error);
  };
  return (
    <form class="flex flex-col gap-4" noValidate onSubmit={(event) => void onSubmit(event)}>
      <FormAlert error={form.formError} />
      <TextAreaField id="content" label={t("reply.label")} help={t("reply.help")} form={form} />
      <p role="status" class="text-caption text-ink-2 empty:hidden">
        {found > 0 ? t("form.masked", { count: found }) : ""}
      </p>
      <Button type="submit" loading={busy} class="self-start">
        {t("reply.submit")}
      </Button>
    </form>
  );
}
