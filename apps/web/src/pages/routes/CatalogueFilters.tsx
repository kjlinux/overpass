import { languageNames, routeStates, supportedLanguages } from "@overpass/shared";
import type { Service } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Field, Select, TextInput } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import { countryOptions, stackOptions } from "../../forms";
import { statusOf } from "./format";
import { queryFromSearch, searchFromQuery } from "./query";
import type { CatalogueQuery } from "./query";

export type CatalogueFiltersProps = {
  query: CatalogueQuery;
  services: Service[];
  onApply: (query: CatalogueQuery) => void;
};

type FilterKey = Exclude<keyof CatalogueQuery, "q">;
const filterKeys: FilterKey[] = ["service", "country", "stack", "language", "state"];

function useFilterOptions(services: Service[]): Record<FilterKey, SelectOption[]> {
  const { t } = useTranslation("ui");
  const language = useLanguage();
  return {
    service: services.map((service) => ({ value: service.slug, label: service.name })),
    country: countryOptions(language),
    stack: stackOptions,
    language: supportedLanguages.map((code) => ({ value: code, label: languageNames[code] })),
    state: routeStates.map((state) => ({ value: state, label: t(`status.${statusOf(state)}`) })),
  };
}

type SelectsProps = {
  draft: CatalogueQuery;
  services: Service[];
  onChange: (key: FilterKey) => (event: Event) => void;
};

function FilterSelects({ draft, services, onChange }: SelectsProps): JSX.Element {
  const { t } = useTranslation("routes");
  const options = useFilterOptions(services);
  return (
    <fieldset class="flex flex-col gap-4">
      <legend class="mb-2 font-semibold">{t("filters.heading")}</legend>
      {filterKeys.map((key) => (
        <Field key={key} id={`filter-${key}`} label={t(`filters.${key}`)}>
          {(control) => (
            <Select
              {...control}
              name={key}
              value={draft[key] ?? ""}
              onChange={onChange(key)}
              options={[{ value: "", label: t("filters.any") }, ...options[key]]}
            />
          )}
        </Field>
      ))}
    </fieldset>
  );
}

/** Search and filters; applied on submit so a keyboard user is never surprised by a reload. */
export function CatalogueFilters({ query, services, onApply }: CatalogueFiltersProps): JSX.Element {
  const { t } = useTranslation("routes");
  const [draft, setDraft] = useState<CatalogueQuery>(query);
  const set = (key: keyof CatalogueQuery) => (event: Event) => {
    setDraft({ ...draft, [key]: (event.currentTarget as HTMLInputElement).value });
  };
  const onSubmit = (event: Event) => {
    event.preventDefault();
    onApply(queryFromSearch(searchFromQuery(draft)));
  };
  const reset = () => {
    setDraft({});
    onApply({});
  };
  return (
    <form class="flex flex-col gap-6" role="search" noValidate onSubmit={onSubmit}>
      <Field id="q" label={t("filters.search")} help={t("filters.searchHelp")}>
        {(control) => (
          <TextInput {...control} type="search" name="q" value={draft.q ?? ""} onInput={set("q")} />
        )}
      </Field>
      <FilterSelects draft={draft} services={services} onChange={set} />
      <div class="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary">
          {t("filters.submit")}
        </Button>
        <Button variant="ghost" onClick={reset}>
          {t("filters.reset")}
        </Button>
      </div>
    </form>
  );
}
