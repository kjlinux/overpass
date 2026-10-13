import type { RouteDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { formatDate } from "./format";
import { weeksWithChecks } from "./weeks";

function stateKey(route: RouteDetail): { key: string; count: number } {
  if (route.state === "broken") return { key: "broken", count: route.unresolvedPotholes };
  if (route.state === "clear") return { key: "clear", count: route.recentCheckers };
  return { key: route.recentCheckers === 1 ? "one" : "none", count: route.recentCheckers };
}

/** One cell per week of the 90 day window, filled where somebody checked the route. */
function FreshnessLog({ route, now }: { route: RouteDetail; now: Date }): JSX.Element {
  const { t } = useTranslation("routes");
  const weeks = weeksWithChecks(
    route.checks.map((check) => check.checkedAt),
    now,
  );
  return (
    <figure class="m-0">
      <div
        role="img"
        aria-label={t("detail.logLabel", { count: route.recentCheckers })}
        class="grid h-7 grid-cols-[repeat(13,minmax(0,1fr))] border border-rule-strong"
      >
        {weeks.map((hit, index) => (
          <span key={index} class={hit ? "bg-ink" : "border-r border-rule last:border-r-0"} />
        ))}
      </div>
      <figcaption class="mt-1 flex justify-between text-caption text-ink-2">
        <span>{t("detail.logFrom")}</span>
        <span>{t("detail.logTo")}</span>
      </figcaption>
    </figure>
  );
}

export type StateBlockProps = { route: RouteDetail; now: Date; id: string; class?: string };

/** Says in words why the route has its state, then shows the freshness log. */
export function StateBlock(props: StateBlockProps): JSX.Element {
  const { route, now, id, class: className } = props;
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const { key, count } = stateKey(route);
  return (
    <section aria-labelledby={id} class={className}>
      <h2 id={id} class="text-body font-semibold">
        {t("detail.stateHeading")}
      </h2>
      <p class="mt-2">{t(`detail.state.${key}`, { count })}</p>
      {route.lastCheckAt === null ? null : (
        <p class="mt-1 text-ink-2">
          {t("detail.lastCheck", { date: formatDate(route.lastCheckAt, language) })}
        </p>
      )}
      <div class="mt-4">
        <FreshnessLog route={route} now={now} />
      </div>
    </section>
  );
}
