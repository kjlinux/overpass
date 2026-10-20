import { languageNames, postCategories, postKinds, supportedLanguages } from "@overpass/shared";
import type { ApiError, PostStatus } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, Field, TextInput } from "../../components/ui";
import { FormAlert, SelectField, TextField, useForm } from "../../forms";
import type { Bindable } from "../../forms";
import { useLanguage } from "../../app/useLanguage";
import { MarkdownPanes } from "./MarkdownPanes";
import { TextAreaField } from "./TextAreaField";
import { emptyPost, postFormSchema } from "./postValues";
import type { PostFormValues } from "./postValues";

export type PostFormProps = {
  isAdmin: boolean;
  initial?: Partial<Record<keyof PostFormValues, string>>;
  /** Language and section cannot change once the post exists. */
  locked?: boolean;
  published?: boolean;
  onSave: (values: PostFormValues, status: PostStatus) => Promise<ApiError | undefined>;
};

function PublishAt({ form }: { form: Bindable }): JSX.Element {
  const { t } = useTranslation("blog");
  const binding = form.bind("publishAt");
  return (
    <Field id="publishAt" label={t("editor.publishAt")} help={t("editor.publishAtHelp")}>
      {(control) => (
        <TextInput
          {...control}
          type="datetime-local"
          name="publishAt"
          value={binding.value}
          onInput={binding.onInput}
        />
      )}
    </Field>
  );
}

function Choices({ form, isAdmin, locked }: { form: Bindable; isAdmin: boolean; locked: boolean }) {
  const { t } = useTranslation("blog");
  const categories = postCategories.map((value) => ({ value, label: t(`categories.${value}`) }));
  const languages = supportedLanguages.map((value) => ({ value, label: languageNames[value] }));
  const kinds = postKinds.map((value) => ({ value, label: t(`kinds.${value}`) }));
  return (
    <div class="grid gap-4 md:grid-cols-3">
      <SelectField id="category" label={t("editor.category")} form={form} options={categories} />
      {locked ? null : (
        <SelectField id="language" label={t("editor.language")} form={form} options={languages} />
      )}
      {isAdmin && !locked ? (
        <SelectField id="kind" label={t("editor.kind")} form={form} options={kinds} />
      ) : null}
    </div>
  );
}

function Actions(props: { busy: PostStatus | null; published: boolean; onDraft: () => void }) {
  const { t } = useTranslation("blog");
  return (
    <div class="flex flex-wrap gap-2 border-t border-rule pt-4">
      <Button type="submit" variant="primary" loading={props.busy === "published"}>
        {t("editor.publish")}
      </Button>
      <Button loading={props.busy === "draft"} onClick={props.onDraft}>
        {t(props.published ? "editor.unpublish" : "editor.saveDraft")}
      </Button>
    </div>
  );
}

function Texts({ form }: { form: Bindable }): JSX.Element {
  const { t } = useTranslation("blog");
  return (
    <>
      <TextField id="title" label={t("editor.title")} form={form} />
      <TextAreaField
        id="summary"
        label={t("editor.summary")}
        help={t("editor.summaryHelp")}
        form={form}
        rows={2}
      />
    </>
  );
}

/** Draft or publish from the same form; the API decides what is valid and who may publish news. */
export function PostForm({
  isAdmin,
  initial = {},
  locked = false,
  published = false,
  onSave,
}: PostFormProps) {
  // A new post starts in the language the member is reading the site in.
  const language = useLanguage();
  const form = useForm(postFormSchema, { ...emptyPost, language, ...initial });
  const [busy, setBusy] = useState<PostStatus | null>(null);
  const save = async (status: PostStatus) => {
    const data = form.validate();
    if (data === undefined || busy !== null) return;
    setBusy(status);
    const error = await onSave(data, status);
    setBusy(null);
    if (error !== undefined) form.showApiError(error);
  };
  return (
    <form
      class="flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save("published");
      }}
    >
      <FormAlert error={form.formError} />
      <Texts form={form} />
      <Choices form={form} isAdmin={isAdmin} locked={locked} />
      <MarkdownPanes form={form} />
      <PublishAt form={form} />
      <Actions busy={busy} published={published} onDraft={() => void save("draft")} />
    </form>
  );
}
