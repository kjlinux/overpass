import { languageNames, supportedLanguages, threadCreateInput } from "@overpass/shared";
import type { DiscussionTopic, Language, ThreadDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import {
  FormAlert,
  SelectField,
  TextField,
  countryOptions,
  stackOptions,
  useForm,
  useSubmit,
} from "../../forms";
import type { Bindable } from "../../forms";
import { useLanguage } from "../../app/useLanguage";
import { apiRequest } from "../../session";
import { MaskedPreview } from "./MaskedPreview";
import { TextAreaField } from "./TextAreaField";

/** The route travels outside the form: it fixes the theme, the service and the country. */
const formSchema = threadCreateInput.omit({ route: true });

export type ThreadFormProps = {
  topics: DiscussionTopic[];
  route?: { id: string; country: string };
  onCreated: (id: string) => void;
};

function initialValues(language: Language, route: ThreadFormProps["route"]) {
  return {
    topic: route === undefined ? "" : "integrations",
    title: "",
    content: "",
    language,
    country: route?.country ?? "",
    stack: "",
    errorText: "",
    codeText: "",
  };
}

function TagFields(props: { form: Bindable; topics: DiscussionTopic[]; fromRoute: boolean }) {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const languages = supportedLanguages.map((code) => ({ value: code, label: languageNames[code] }));
  const topics = props.topics.map((topic) => ({ value: topic.slug, label: topic.name }));
  return (
    <div class="grid gap-6 md:grid-cols-2">
      {props.fromRoute ? null : (
        <SelectField id="topic" label={t("form.topic")} form={props.form} options={topics} />
      )}
      <SelectField id="language" label={t("form.language")} form={props.form} options={languages} />
      {props.fromRoute ? null : (
        <SelectField
          id="country"
          label={t("form.country")}
          form={props.form}
          options={countryOptions(language)}
        />
      )}
      <SelectField id="stack" label={t("form.stack")} form={props.form} options={stackOptions} />
    </div>
  );
}

/** Title, message, error and code, with the masked preview of what will be published. */
export function ThreadForm({ topics, route, onCreated }: ThreadFormProps): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const form = useForm(formSchema, initialValues(language, route));
  const { busy, onSubmit } = useSubmit({
    validate: form.validate,
    send: (data) =>
      apiRequest<ThreadDetail>("POST", "/v1/threads", {
        ...data,
        ...(route && { route: route.id }),
      }),
    onError: (error) => {
      form.showApiError(error);
    },
    onSuccess: (thread) => {
      onCreated(thread.id);
    },
  });
  return (
    <form class="flex flex-col gap-8" noValidate onSubmit={onSubmit}>
      <FormAlert error={form.formError} />
      <MessageFields form={form} />
      <TagFields form={form} topics={topics} fromRoute={route !== undefined} />
      <MaskedPreview values={previewOf(form.values)} />
      <Button type="submit" variant="primary" loading={busy} class="self-start">
        {t("form.submit")}
      </Button>
    </form>
  );
}

const previewOf = (values: Record<string, string>) => ({
  title: values["title"] ?? "",
  content: values["content"] ?? "",
  errorText: values["errorText"] ?? "",
  codeText: values["codeText"] ?? "",
});

/** The free text, then the pasted error and code in the mono face. */
const areas = [
  { id: "content", help: "contentHelp", rows: 8, code: false },
  { id: "errorText", help: "errorHelp", rows: 6, code: true },
  { id: "codeText", help: "codeHelp", rows: 10, code: true },
] as const;

function MessageFields({ form }: { form: Bindable }): JSX.Element {
  const { t } = useTranslation("discussions");
  return (
    <>
      <TextField id="title" label={t("form.title")} help={t("form.titleHelp")} form={form} />
      {areas.map((area) => (
        <TextAreaField
          key={area.id}
          id={area.id}
          label={t(`form.${area.id}`)}
          help={t(`form.${area.help}`)}
          form={form}
          rows={area.rows}
          code={area.code}
        />
      ))}
    </>
  );
}
