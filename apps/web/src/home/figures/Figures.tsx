import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Counter } from "./Counter";
import type { Stats } from "@overpass/shared";

const figures = ["routes", "checks", "countries"] as const;

function valueOf(stats: Stats, figure: (typeof figures)[number]): number {
  return figure === "countries" ? stats.countries.length : stats[figure];
}

/** Three real figures in large mono, rising once when they first show. */
export function Figures({ stats, language }: { stats: Stats; language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <ul aria-label={t("figures.label")} class="grid border-t border-rule md:grid-cols-3">
      {figures.map((figure) => {
        const value = valueOf(stats, figure);
        return (
          <li
            key={figure}
            class="flex flex-col gap-1 border-b border-rule py-5 md:border-b-0 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0"
          >
            <Counter value={value} language={language} />
            <span class="text-caption text-ink-2">{t(`figures.${figure}`, { count: value })}</span>
          </li>
        );
      })}
    </ul>
  );
}
