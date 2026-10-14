import type { SandboxProvider } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Chip, Field, Select } from "../../components/ui";
import { Section } from "./parts";

type Props = {
  providers: SandboxProvider[];
  provider: SandboxProvider;
  unavailable: boolean;
  onSelect: (id: string) => void;
};

function countryNames(codes: string[], language: string): string {
  const names = new Intl.DisplayNames([language], { type: "region" });
  return codes.map((code) => names.of(code) ?? code).join(", ");
}

function Source({ provider }: { provider: SandboxProvider }): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();
  const consulted = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" });
  const docs = new URL(provider.docsUrl);
  const rows: [string, JSX.Element | string][] = [
    [t("provider.docs"), <a href={provider.docsUrl}>{docs.host + docs.pathname}</a>],
    [t("provider.version"), provider.docsVersion],
    [t("provider.consulted"), consulted.format(new Date(provider.consultedAt))],
    [t("provider.countries"), countryNames(provider.countries, language)],
  ];
  return (
    <dl class="mt-4 border-t border-rule">
      {rows.map(([term, value]) => (
        <div key={term} class="grid grid-cols-[9em_minmax(0,1fr)] gap-3 border-b border-rule py-2">
          <dt class="text-caption font-medium text-ink-2">{term}</dt>
          <dd class="[overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Choices({ provider }: { provider: SandboxProvider }): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <>
      {provider.officialSandboxUrl === null ? null : (
        <p class="mt-4">
          <a href={provider.officialSandboxUrl}>{t("provider.officialSandbox")}</a>
        </p>
      )}
      <details class="mt-4 border border-rule">
        <summary class="flex min-h-tap cursor-pointer items-center px-4 font-semibold">
          {t("provider.choices")}
        </summary>
        <ul class="list-square space-y-2 pb-4 pl-8 pr-4">
          {provider.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>
    </>
  );
}

/** Which provider is simulated, and the facts that make "unofficial" checkable. */
export function ProviderPanel({ providers, provider, unavailable, onSelect }: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  const options = providers.map((item) => ({ value: item.id, label: item.name }));
  return (
    <Section
      id="sandbox-provider"
      title={t("provider.heading")}
      aside={<Chip>{t("provider.unofficial")}</Chip>}
    >
      {unavailable ? (
        <p class="mb-4 border border-rule-strong bg-surface p-4">{t("provider.unavailable")}</p>
      ) : null}
      <Field id="sandbox-provider-select" label={t("provider.label")}>
        {(control) => (
          <Select
            {...control}
            options={options}
            value={provider.id}
            onChange={(event) => {
              onSelect(event.currentTarget.value);
            }}
          />
        )}
      </Field>
      <Source provider={provider} />
      <Choices provider={provider} />
    </Section>
  );
}
