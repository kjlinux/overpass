import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Flag } from "../../components/ui";
import { placeCountries } from "./places";

const skeletonTiles = 8;

function regionName(code: string, language: Language): string {
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Covered countries as ruled tiles at their approximate place; names come from the browser's locale data. */
export function Atlas({
  countries,
  language,
}: {
  countries: string[];
  language: Language;
}): JSX.Element {
  return (
    <ul class="home-atlas grid grid-cols-2 border-l border-t border-rule">
      {placeCountries(countries).map(({ code, column, row }) => (
        <li
          key={code}
          style={{ "--c": column, "--r": row }}
          class="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-b border-r border-rule bg-paper p-3"
        >
          <b class="font-code font-medium md:text-h3">{code}</b>
          <span class="text-caption md:leading-tight">
            <Flag country={code} name={regionName(code, language)} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Placeholder of the tiles and figures while GET /v1/stats answers; the section sits far below the fold. */
export function StatsSkeleton(): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <div aria-busy="true" aria-label={t("countries.loading")} class="border-t border-rule py-6">
      <div class="grid grid-cols-2 gap-2 md:grid-cols-9">
        {Array.from({ length: skeletonTiles }, (_, index) => (
          <div key={index} class="skeleton-bar h-12 md:h-24" />
        ))}
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} class="skeleton-bar h-14" />
        ))}
      </div>
    </div>
  );
}
