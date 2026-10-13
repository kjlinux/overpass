import { countryName } from "@overpass/shared";
import type { Coverage, Service } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { localizedPath } from "../../layout";
import { formatDate } from "./format";

/** Source confirmations grouped by source, so each source and its date appear once. */
function bySource(coverage: Coverage[]): { source: string; date: string; countries: string[] }[] {
  const groups = new Map<string, { source: string; date: string; countries: string[] }>();
  for (const entry of coverage) {
    if (entry.basis !== "source" || entry.source === null) continue;
    const group = groups.get(entry.source) ?? {
      source: entry.source,
      date: entry.consultedOn ?? "",
      countries: [],
    };
    groups.set(entry.source, { ...group, countries: [...group.countries, entry.country] });
  }
  return [...groups.values()];
}

function Names({ countries }: { countries: string[] }): JSX.Element {
  const language = useLanguage();
  return <p class="mt-1">{countries.map((code) => countryName(code, language)).join(", ")}</p>;
}

function CommunityList({ entries }: { entries: Coverage[] }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  return (
    <div class="border-t border-rule py-4">
      <p class="font-semibold">{t("coverage.community")}</p>
      <ul class="m-0 mt-1 list-none p-0">
        {entries.map((entry) => (
          <li key={entry.country}>
            {countryName(entry.country, language)}
            {entry.routeId === null ? null : (
              <>
                {" · "}
                <a href={localizedPath(language, `/routes/${entry.routeId}`)}>
                  {t("coverage.route")}
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Only confirmed countries, each with what confirmed it: a dated source or a clear road. */
export function CoverageSection({ service }: { service: Service }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const community = service.coverage.filter((entry) => entry.basis === "community");
  return (
    <section
      id="coverage"
      aria-labelledby="coverage-heading"
      class="max-w-prose scroll-mt-4 border-t border-ink py-8"
    >
      <h2 id="coverage-heading" class="text-h2 font-semibold">
        {t("coverage.heading", { service: service.name })}
      </h2>
      <p class="mb-4 mt-2 text-ink-2">{t("coverage.intro")}</p>
      {service.coverage.length === 0 ? (
        <p class="border-t border-rule py-4 text-ink-2">{t("coverage.none")}</p>
      ) : null}
      {bySource(service.coverage).map((group) => (
        <div key={group.source} class="border-t border-rule py-4">
          <p class="text-caption text-ink-2">
            {t("coverage.source", { date: formatDate(`${group.date}T12:00:00Z`, language) })}{" "}
            <a class="[overflow-wrap:anywhere]" href={group.source} rel="noopener noreferrer">
              {new URL(group.source).hostname}
            </a>
          </p>
          <Names countries={group.countries} />
        </div>
      ))}
      {community.length === 0 ? null : <CommunityList entries={community} />}
    </section>
  );
}
