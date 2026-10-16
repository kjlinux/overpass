import { languageNames, supportedLanguages, threadStates } from "@overpass/shared";
import type { DiscussionTopic } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Field, Select } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import { countryOptions, stackOptions } from "../../forms";
import { threadQueryFrom, threadSearch } from "./query";
import type { ThreadQuery } from "./query";

type FilterKey = keyof ThreadQuery;
const filterKeys: FilterKey[] = ["topic", "country", "stack", "language", "state"];

function useOptions(topics: DiscussionTopic[]): Record<FilterKey, SelectOption[]> {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  return {
    topic: topics.map((topic) => ({ value: topic.slug, label: topic.name })),
    country: countryOptions(language),
    stack: stackOptions,
    language: supportedLanguages.map((code) => ({ value: code, label: languageNames[code] })),
    state: threadStates.map((state) => ({ value: state, label: t(`state.${state}`) })),
  };
}

export type ThreadFiltersProps = {
  query: ThreadQuery;
  topics: DiscussionTopic[];
  onApply: (query: ThreadQuery) => void;
};

/** Applied on submit, so a keyboard user is never surprised by a reload. */
type SelectsProps = {
  draft: ThreadQuery;
  topics: DiscussionTopic[];
  onChange: (draft: ThreadQuery) => void;
};

function FilterSelects({ draft, topics, onChange }: SelectsProps): JSX.Element {
  const { t } = useTranslation("discussions");
  const options = useOptions(topics);
  return (
    <fieldset class="flex flex-col gap-4">
      <legend class="mb-2 font-semibold">{t("filters.heading")}</legend>
      {filterKeys.map((key) => (
        <Field key={key} id={`thread-${key}`} label={t(`filters.${key}`)}>
          {(control) => (
            <Select
              {...control}
              name={key}
              value={draft[key] ?? ""}
              onChange={(event) => {
                onChange({ ...draft, [key]: event.currentTarget.value });
              }}
              options={[{ value: "", label: t("filters.any") }, ...options[key]]}
            />
          )}
        </Field>
      ))}
    </fieldset>
  );
}

export function ThreadFilters({ query, topics, onApply }: ThreadFiltersProps): JSX.Element {
  const { t } = useTranslation("discussions");
  const [draft, setDraft] = useState<ThreadQuery>(query);
  const onSubmit = (event: Event) => {
    event.preventDefault();
    onApply(threadQueryFrom(threadSearch(draft)));
  };
  return (
    <form class="flex flex-col gap-6" role="search" noValidate onSubmit={onSubmit}>
      <FilterSelects draft={draft} topics={topics} onChange={setDraft} />
      <div class="flex flex-wrap items-center gap-4">
        <Button type="submit">{t("filters.submit")}</Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDraft({});
            onApply({});
          }}
        >
          {t("filters.reset")}
        </Button>
      </div>
    </form>
  );
}
