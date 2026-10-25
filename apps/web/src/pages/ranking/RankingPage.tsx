import { pointRules, pointSources, trustRules } from "@overpass/shared";
import type { CountryRank, DeveloperRank } from "@overpass/shared";
import { Trophy } from "lucide-preact";
import type { ComponentChildren, JSX } from "preact";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, EmptyState, Field, Select, Skeleton } from "../../components/ui";
import { countryOptions } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { Fetched, useApi } from "../routes";
import type { Loaded } from "../routes";
import { CountryTable, DeveloperTable } from "./RankingTables";

type ShowProps<T> = {
  state: Loaded<T[]>;
  reload: () => unknown;
  children: (rows: T[]) => ComponentChildren;
};

function Show<T>(props: ShowProps<T>) {
  const { t } = useTranslation("ranking");
  const language = useLanguage();
  const api = { state: props.state, reload: () => Promise.resolve(void props.reload()) };
  const browse = (
    <ButtonLink href={localizedPath(language, "/routes")}>{t("empty.action")}</ButtonLink>
  );
  const empty = (
    <EmptyState
      icon={Trophy}
      title={t("empty.title")}
      description={t("empty.text")}
      action={browse}
    />
  );
  return (
    <Fetched api={api} placeholder={<Skeleton lines={5} />}>
      {(rows) => (rows.length > 0 ? props.children(rows) : empty)}
    </Fetched>
  );
}

/** Applied on submit, like every filter of the site. */
function CountryFilter({ value, onApply }: { value: string; onApply: (country: string) => void }) {
  const { t } = useTranslation("ranking");
  const language = useLanguage();
  const [draft, setDraft] = useState(value);
  const options = [{ value: "", label: t("developers.all") }, ...countryOptions(language)];
  const onSubmit = (event: Event) => {
    event.preventDefault();
    onApply(draft);
  };
  return (
    <form class="flex flex-wrap items-end gap-4" role="search" onSubmit={onSubmit}>
      <Field id="ranking-country" label={t("developers.country")}>
        {(control) => (
          <Select
            {...control}
            value={draft}
            options={options}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
            }}
          />
        )}
      </Field>
      <Button type="submit">{t("developers.filter")}</Button>
    </form>
  );
}

function PointRules(): JSX.Element {
  const { t } = useTranslation("ranking");
  return (
    <section aria-labelledby="rules-heading" class="border-t border-rule py-8">
      <h2 id="rules-heading" class="text-h2 font-semibold">
        {t("rules.heading")}
      </h2>
      <p class="mt-2 max-w-prose text-ink-2">{t("rules.intro")}</p>
      <ul class="m-0 mt-4 grid list-none border-t border-rule p-0 sm:grid-cols-2 lg:grid-cols-3">
        {pointSources.map((source) => (
          <li key={source} class="flex justify-between gap-4 border-b border-rule py-3 sm:pr-6">
            <span>{t(`rules.${source}`)}</span>
            <span class="font-bold tabular-nums">
              {t("rules.points", { count: pointRules[source] })}
            </span>
          </li>
        ))}
      </ul>
      <p class="mt-6 max-w-prose">{t("rules.trust", { count: trustRules.confirmedMinPoints })}</p>
    </section>
  );
}

/** Countries first, then developers; points are computed from contributions, never typed. */
export function RankingPage(): JSX.Element {
  const { t } = useTranslation("ranking");
  const language = useLanguage();
  const { query, route } = useLocation();
  const country = query["country"] ?? "";
  const countries = useApi<CountryRank[]>("/v1/ranking/countries");
  const developers = useApi<DeveloperRank[]>(
    `/v1/ranking/developers${country === "" ? "" : `?country=${country}`}`,
  );
  const apply = (next: string) => {
    route(`${localizedPath(language, "/ranking")}${next === "" ? "" : `?country=${next}`}`);
  };
  return (
    <Layout language={language}>
      <section class="py-12 md:py-16">
        <h1 class="text-h1 font-semibold">{t("title")}</h1>
        <p class="mt-2 max-w-prose text-ink-2">{t("intro")}</p>
        <section aria-labelledby="countries-heading" class="mt-8 border-t border-rule py-8">
          <h2 id="countries-heading" class="mb-4 text-h2 font-semibold">
            {t("countries.heading")}
          </h2>
          <Show {...countries}>{(rows) => <CountryTable rows={rows} />}</Show>
        </section>
        <section aria-labelledby="developers-heading" class="border-t border-rule py-8">
          <h2 id="developers-heading" class="mb-4 text-h2 font-semibold">
            {t("developers.heading")}
          </h2>
          <div class="mb-6">
            <CountryFilter key={country} value={country} onApply={apply} />
          </div>
          <Show {...developers}>{(rows) => <DeveloperTable rows={rows} />}</Show>
        </section>
        <PointRules />
      </section>
    </Layout>
  );
}
