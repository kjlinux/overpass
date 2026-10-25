import { languageNames, postCategories, searchKinds, supportedLanguages } from "@overpass/shared";
import type { DiscussionTopic } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, Field, Select, TextInput } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import { useApi } from "../routes";
import type { SearchParams } from "./query";

type Props = { params: SearchParams; onApply: (params: SearchParams) => void };

/** Blog categories for articles, discussion topics for discussions, nothing for the rest. */
function useCategories(kind: SearchParams["kind"]): SelectOption[] {
  const { t } = useTranslation(["search", "blog"]);
  const topics = useApi<DiscussionTopic[]>(kind === "threads" ? "/v1/topics" : null).state;
  const all = { value: "", label: t("search:filters.allCategories") };
  if (kind === "posts") {
    return [
      all,
      ...postCategories.map((value) => ({ value, label: t(`blog:categories.${value}`) })),
    ];
  }
  if (kind === "threads" && topics.status === "ready") {
    return [all, ...topics.data.map((topic) => ({ value: topic.slug, label: topic.name }))];
  }
  return [all];
}

const valueOf = (event: Event) => (event.currentTarget as HTMLInputElement).value;

type SelectsProps = {
  draft: SearchParams;
  pick: (key: keyof SearchParams) => (event: Event) => void;
};

function FilterSelects({ draft, pick }: SelectsProps): JSX.Element {
  const { t } = useTranslation("search");
  const categories = useCategories(draft.kind);
  const kinds = [{ value: "", label: t("filters.allKinds") }].concat(
    searchKinds.map((kind) => ({ value: kind, label: t(`kinds.${kind}`) })),
  );
  const languages = [{ value: "", label: t("filters.allLanguages") }].concat(
    supportedLanguages.map((value) => ({ value, label: languageNames[value] })),
  );
  const open = categories.length > 1;
  const fields = [
    { key: "kind", options: kinds, label: t("filters.kind") },
    { key: "language", options: languages, label: t("filters.language") },
    { key: "category", options: categories, label: t("filters.category") },
  ] as const;
  return (
    <>
      {fields.map(({ key, options, label }) => (
        <Field
          key={key}
          id={`search-${key}`}
          label={label}
          {...(key === "category" && !open ? { help: t("filters.categoryHelp") } : {})}
        >
          {(control) => (
            <Select
              {...control}
              options={options}
              disabled={key === "category" && !open}
              value={draft[key] ?? ""}
              onChange={pick(key)}
            />
          )}
        </Field>
      ))}
    </>
  );
}

function FormActions({ onReset }: { onReset: () => void }): JSX.Element {
  const { t } = useTranslation("search");
  return (
    <div class="flex flex-wrap items-center gap-4">
      <Button type="submit" variant="primary">
        {t("filters.submit")}
      </Button>
      <Button variant="ghost" onClick={onReset}>
        {t("filters.reset")}
      </Button>
    </div>
  );
}

/** Applied on submit, so a keyboard user is never surprised by a reload. */
export function SearchFilters({ params, onApply }: Props): JSX.Element {
  const { t } = useTranslation("search");
  const [draft, setDraft] = useState<SearchParams>(params);
  const pick = (key: keyof SearchParams) => (event: Event) => {
    const value = valueOf(event);
    const rest = { ...draft, [key]: value === "" ? undefined : value };
    setDraft(key === "kind" ? { ...rest, category: undefined } : rest);
  };
  const onSubmit = (event: Event) => {
    event.preventDefault();
    onApply({ ...draft, q: draft.q.trim() });
  };
  return (
    <form role="search" noValidate onSubmit={onSubmit} class="flex flex-col gap-6">
      <Field id="search-q" label={t("filters.q")} help={t("filters.qHelp")}>
        {(control) => (
          <TextInput
            {...control}
            type="search"
            value={draft.q}
            onInput={(event) => {
              setDraft({ ...draft, q: valueOf(event) });
            }}
          />
        )}
      </Field>
      <FilterSelects draft={draft} pick={pick} />
      <FormActions
        onReset={() => {
          onApply({ q: draft.q.trim() });
        }}
      />
    </form>
  );
}
