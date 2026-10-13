import { countryName, stackNames } from "@overpass/shared";
import type { RouteSummary, StackId } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Chip, StatusBadge } from "../../components/ui";
import { localizedPath } from "../../layout/nav";
import { formatDate, statusOf } from "./format";

/** A stack id named as written by its makers, or the id itself when unknown. */
export function stackName(stack: string): string {
  return stack in stackNames ? stackNames[stack as StackId] : stack;
}

/** The whole card is one link; the badge only informs. */
export function RouteCard({ route }: { route: RouteSummary }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const checked =
    route.lastCheckAt === null
      ? t("card.neverChecked")
      : t("card.lastCheck", { date: formatDate(route.lastCheckAt, language) });
  return (
    <a
      href={localizedPath(language, `/routes/${route.id}`)}
      class="flex h-full flex-col gap-3 border border-rule bg-paper p-4 text-ink no-underline hover:bg-surface sm:p-6"
    >
      <span class="self-start">
        <StatusBadge status={statusOf(route.state)} />
      </span>
      <h3 class="text-h3 font-semibold [overflow-wrap:anywhere]">{route.title}</h3>
      <p class="text-ink-2">
        {route.service.name} · {countryName(route.country, language)}
      </p>
      <p class="text-caption text-ink-2">
        {checked} · {t("card.by", { author: route.author })}
      </p>
      <div class="mt-auto flex flex-wrap gap-2">
        <Chip>{stackName(route.stack)}</Chip>
        <Chip>{route.language.toUpperCase()}</Chip>
      </div>
    </a>
  );
}
