import type { RoutePage } from "@overpass/shared";
import { Route } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, EmptyState } from "../../components/ui";
import { localizedPath } from "../../layout/nav";
import { RouteCard } from "./RouteCard";

export type CatalogueResultsProps = { page: RoutePage; onMore: () => void; loadingMore?: boolean };

export function CatalogueResults({
  page,
  onMore,
  loadingMore = false,
}: CatalogueResultsProps): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  if (page.items.length === 0) {
    const write = (
      <ButtonLink href={localizedPath(language, "/routes/new")}>{t("catalogue.write")}</ButtonLink>
    );
    return (
      <EmptyState
        icon={Route}
        title={t("catalogue.emptyTitle")}
        description={t("catalogue.emptyText")}
        action={write}
      />
    );
  }
  return (
    <div class="flex flex-col gap-6">
      <p class="text-caption text-ink-2" role="status">
        {t("catalogue.results", { count: page.items.length })}
      </p>
      <ul class="grid gap-4 md:grid-cols-2">
        {page.items.map((route) => (
          <li key={route.id} class="min-w-0">
            <RouteCard route={route} />
          </li>
        ))}
      </ul>
      {page.nextCursor === null ? null : (
        <Button class="self-start" onClick={onMore} loading={loadingMore}>
          {t("catalogue.more")}
        </Button>
      )}
    </div>
  );
}
