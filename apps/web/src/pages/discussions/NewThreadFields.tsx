import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Field, Select, TextInput } from "../../components/ui";
import { countryOptions, stackOptions } from "../../forms/options";
import type { Topic } from "./types";

export type ThreadFormState = {
  topicId: string;
  title: string;
  country: string;
  stack: string;
  routeId: string;
  content: string;
};

type Props = {
  topics: Topic[];
  form: ThreadFormState;
  onChange: (patch: Partial<ThreadFormState>) => void;
};

function TopicAndTitleFields({ topics, form, onChange }: Props): JSX.Element {
  const { t } = useTranslation("discussions");
  const topicOptions = topics.map((tp) => ({ value: tp.id, label: tp.name }));

  return (
    <>
      <Field id="topic" label={t("new.topic")}>
        {(ctrl) => (
          <Select
            {...ctrl}
            options={topicOptions}
            value={form.topicId}
            onChange={(e) => {
              onChange({ topicId: (e.target as HTMLSelectElement).value });
            }}
            required
          />
        )}
      </Field>

      <Field id="title" label={t("new.threadTitle")}>
        {(ctrl) => (
          <TextInput
            {...ctrl}
            value={form.title}
            placeholder={t("new.threadTitlePlaceholder")}
            onInput={(e) => {
              onChange({ title: (e.target as HTMLInputElement).value });
            }}
            required
            minLength={3}
            maxLength={160}
          />
        )}
      </Field>
    </>
  );
}

function CountryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (country: string) => void;
}): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const countries = [
    { value: "", label: t("new.countryPlaceholder") },
    ...countryOptions(language),
  ];

  return (
    <Field id="country" label={t("new.country")}>
      {(ctrl) => (
        <Select
          {...ctrl}
          options={countries}
          value={value}
          onChange={(e) => {
            onChange((e.target as HTMLSelectElement).value);
          }}
        />
      )}
    </Field>
  );
}

function StackField({
  value,
  onChange,
}: {
  value: string;
  onChange: (stack: string) => void;
}): JSX.Element {
  const { t } = useTranslation("discussions");
  const stacks = [{ value: "", label: t("new.stackPlaceholder") }, ...stackOptions];

  return (
    <Field id="stack" label={t("new.stack")}>
      {(ctrl) => (
        <Select
          {...ctrl}
          options={stacks}
          value={value}
          onChange={(e) => {
            onChange((e.target as HTMLSelectElement).value);
          }}
        />
      )}
    </Field>
  );
}

export function NewThreadMetaFields(props: Props): JSX.Element {
  const { t } = useTranslation("discussions");

  return (
    <>
      <TopicAndTitleFields {...props} />
      <div class="grid gap-4 md:grid-cols-2">
        <CountryField
          value={props.form.country}
          onChange={(country) => {
            props.onChange({ country });
          }}
        />
        <StackField
          value={props.form.stack}
          onChange={(stack) => {
            props.onChange({ stack });
          }}
        />
      </div>
      <Field id="routeId" label={t("new.routeId")}>
        {(ctrl) => (
          <TextInput
            {...ctrl}
            value={props.form.routeId}
            placeholder={t("new.routeIdPlaceholder")}
            onInput={(e) => {
              props.onChange({ routeId: (e.target as HTMLInputElement).value });
            }}
          />
        )}
      </Field>
    </>
  );
}
