import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "../../components/ui";
import type { RouteStatus } from "../../components/ui";
import { localizedPath } from "../../layout";
import { RouteCard } from "../../pages/routes/RouteCard";
import { SectionHead, sectionClass } from "../SectionHead";
import { latestView } from "./latest";
import { LatestSkeleton } from "./LatestSkeleton";
import { useLatest } from "./useLatest";

const states: RouteStatus[] = ["clear", "toVerify", "broken"];

function Legend(): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <ul aria-label={t("routes.states")} class="mt-6 grid gap-3 md:grid-cols-3">
      {states.map((state) => (
        <li key={state} class="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
          <StatusBadge status={state} />
          <span>{t(`routes.${state}`)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Real sheets with their state, so a visitor sees what an itinerary is before opening one. */
export function LatestRoutes({ language }: { language: Language }): JSX.Element | null {
  const { t } = useTranslation("home");
  const view = latestView(useLatest("routes"));
  if (view.kind === "hidden") return null;
  return (
    <section id="routes" aria-labelledby="routes-title" class={sectionClass}>
      <SectionHead
        id="routes-title"
        title={t("latest.routes.title")}
        intro={t("latest.routes.intro")}
      />
      {view.kind === "loading" ? (
        <LatestSkeleton label={t("latest.routes.loading")} tall />
      ) : (
        <ul class="grid gap-4 md:grid-cols-3">
          {view.items.map((route) => (
            <li key={route.id}>
              <RouteCard route={route} />
            </li>
          ))}
        </ul>
      )}
      <Legend />
      <p class="mt-6">
        <a href={localizedPath(language, "/routes")}>{t("latest.routes.all")}</a>
      </p>
    </section>
  );
}
