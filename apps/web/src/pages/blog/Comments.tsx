import { commentCreateInput } from "@overpass/shared";
import type { ApiError, CommentPage, PostComment } from "@overpass/shared";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink } from "../../components/ui";
import { FormAlert, useForm } from "../../forms";
import { localizedPath } from "../../layout";
import { Markdown } from "../../markdown";
import { formatDate } from "../routes";
import { TextAreaField } from "./TextAreaField";

export type CommentActions = {
  comment: (content: string) => Promise<ApiError | undefined>;
  report: (kind: "post" | "comment", id: string) => Promise<ApiError | undefined>;
};

function CommentItem(props: { item: PostComment; signedIn: boolean; actions: CommentActions }) {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { item } = props;
  const canReport = props.signedIn && !item.viewer.isAuthor && item.moderation === "visible";
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4">
      <p class="m-0 text-caption text-ink-2">
        <span class="font-semibold text-ink">{item.author ?? t("deletedAuthor")}</span>
        {" · "}
        <time dateTime={item.createdAt}>{formatDate(item.createdAt, language)}</time>
      </p>
      {item.content === null ? (
        <p class="m-0 text-ink-2">{t("comments.hidden")}</p>
      ) : (
        <Markdown source={item.content} />
      )}
      {item.viewer.reported ? (
        <p class="m-0 text-caption text-ink-2">{t("comments.reported")}</p>
      ) : null}
      {canReport && !item.viewer.reported ? (
        <Button
          variant="ghost"
          class="self-start"
          onClick={() => void props.actions.report("comment", item.id)}
        >
          {t("comments.report")}
        </Button>
      ) : null}
    </li>
  );
}

function CommentForm({ signedIn, actions }: { signedIn: boolean; actions: CommentActions }) {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { url } = useLocation();
  const form = useForm(commentCreateInput, { content: "" });
  const [busy, setBusy] = useState(false);
  if (!signedIn) {
    const href = `${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`;
    return (
      <ButtonLink href={href} class="self-start">
        {t("comments.signIn")}
      </ButtonLink>
    );
  }
  const onSubmit = async (event: Event) => {
    event.preventDefault();
    const data = form.validate();
    if (data === undefined || busy) return;
    setBusy(true);
    const error = await actions.comment(data.content);
    setBusy(false);
    if (error === undefined) form.setValues({ content: "" });
    else form.showApiError(error);
  };
  return (
    <form class="flex flex-col gap-4" noValidate onSubmit={(event) => void onSubmit(event)}>
      <FormAlert error={form.formError} />
      <TextAreaField
        id="content"
        label={t("comments.label")}
        help={t("comments.help")}
        form={form}
        rows={4}
      />
      <Button type="submit" loading={busy} class="self-start">
        {t("comments.submit")}
      </Button>
    </form>
  );
}

/** Oldest first, then the form, so a reply reads as the continuation of the thread. */
export function Comments(props: { page: CommentPage; signedIn: boolean; actions: CommentActions }) {
  const { t } = useTranslation("blog");
  return (
    <section aria-labelledby="comments-heading" class="flex flex-col gap-6">
      <h2 id="comments-heading" class="m-0 text-h2 font-semibold">
        {t("comments.heading")}
      </h2>
      {props.page.items.length === 0 ? (
        <p class="m-0 text-ink-2">{t("comments.empty")}</p>
      ) : (
        <ul class="m-0 list-none border-t border-rule p-0">
          {props.page.items.map((item) => (
            <CommentItem
              key={item.id}
              item={item}
              signedIn={props.signedIn}
              actions={props.actions}
            />
          ))}
        </ul>
      )}
      <CommentForm signedIn={props.signedIn} actions={props.actions} />
    </section>
  );
}
