import { countryName } from "@overpass/shared";
import type { MyCheck, RouteSummary } from "@overpass/shared";
import { CircleCheck, Route } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, EmptyState, StatusBadge } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate, statusOf } from "../routes/format";

const rowClass = "flex flex-col gap-2 border-b border-rule py-4";

export function MyRoutesList({ routes }: { routes: RouteSummary[] }): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  if (routes.length === 0) {
    const write = (
      <ButtonLink href={localizedPath(language, "/routes/new")}>{t("routes.action")}</ButtonLink>
    );
    return (
      <EmptyState
        icon={Route}
        title={t("routes.emptyTitle")}
        description={t("routes.emptyText")}
        action={write}
      />
    );
  }
  return (
    <ul class="m-0 list-none border-t border-rule p-0">
      {routes.map((route) => (
        <li key={route.id} class={rowClass}>
          <span class="self-start">
            <StatusBadge status={statusOf(route.state)} />
          </span>
          <a
            class="font-semibold [overflow-wrap:anywhere]"
            href={localizedPath(language, `/routes/${route.id}`)}
          >
            {route.title}
          </a>
          <a
            class="inline-flex min-h-tap items-center self-start"
            href={localizedPath(language, `/routes/${route.id}/edit`)}
          >
            {t("routes.edit")}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function MyChecksList({ checks }: { checks: MyCheck[] }): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  if (checks.length === 0) {
    const browse = (
      <ButtonLink href={localizedPath(language, "/routes")}>{t("checks.action")}</ButtonLink>
    );
    return (
      <EmptyState
        icon={CircleCheck}
        title={t("checks.emptyTitle")}
        description={t("checks.emptyText")}
        action={browse}
      />
    );
  }
  return (
    <ol class="m-0 list-none border-t border-rule p-0">
      {checks.map((check) => (
        <li key={check.id} class={rowClass}>
          <time dateTime={check.checkedAt} class="font-semibold tabular-nums">
            {formatDate(check.checkedAt, language)}
          </time>
          <a
            class="[overflow-wrap:anywhere]"
            href={localizedPath(language, `/routes/${check.route.id}`)}
          >
            {check.route.title}
          </a>
          <span class="text-caption text-ink-2">
            {countryName(check.country, language)} · {check.environment}
          </span>
        </li>
      ))}
    </ol>
  );
}
