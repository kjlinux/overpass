import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Field, Select } from "../../components/ui";
import { countryOptions, stackOptions } from "../../forms/options";
import type { DiscussionsFilterState, Topic } from "./types";

type Props = {
  topics: Topic[];
  filters: DiscussionsFilterState;
  onChange: (filters: DiscussionsFilterState) => void;
};

function TopicFilter({
  topics,
  value,
  onSelect,
}: {
  topics: Topic[];
  value: string;
  onSelect: (val: string) => void;
}): JSX.Element {
  const { t } = useTranslation("discussions");
  const options = [
    { value: "", label: t("topics.all") },
    ...topics.map((tp) => ({ value: tp.id, label: tp.name })),
  ];
  return (
    <Field id="filter-topic" label={t("topics.label")}>
      {(ctrl) => (
        <Select
          {...ctrl}
          options={options}
          value={value}
          onChange={(e) => {
            onSelect((e.target as HTMLSelectElement).value);
          }}
        />
      )}
    </Field>
  );
}

function CountryFilter({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (val: string) => void;
}): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const options = [{ value: "", label: t("country.all") }, ...countryOptions(language)];
  return (
    <Field id="filter-country" label={t("country.label")}>
      {(ctrl) => (
        <Select
          {...ctrl}
          options={options}
          value={value}
          onChange={(e) => {
            onSelect((e.target as HTMLSelectElement).value);
          }}
        />
      )}
    </Field>
  );
}

function StackFilter({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (val: string) => void;
}): JSX.Element {
  const { t } = useTranslation("discussions");
  const options = [{ value: "", label: t("stack.all") }, ...stackOptions];
  return (
    <Field id="filter-stack" label={t("stack.label")}>
      {(ctrl) => (
        <Select
          {...ctrl}
          options={options}
          value={value}
          onChange={(e) => {
            onSelect((e.target as HTMLSelectElement).value);
          }}
        />
      )}
    </Field>
  );
}

export function DiscussionsFilters({ topics, filters, onChange }: Props): JSX.Element {
  return (
    <div class="grid gap-4 border border-rule bg-paper p-4 md:grid-cols-3">
      <TopicFilter
        topics={topics}
        value={filters.topicId}
        onSelect={(topicId) => {
          onChange({ ...filters, topicId });
        }}
      />
      <CountryFilter
        value={filters.country}
        onSelect={(country) => {
          onChange({ ...filters, country });
        }}
      />
      <StackFilter
        value={filters.stack}
        onSelect={(stack) => {
          onChange({ ...filters, stack });
        }}
      />
    </div>
  );
}
