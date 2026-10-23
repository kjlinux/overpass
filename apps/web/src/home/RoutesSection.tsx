import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "../components/ui";
import type { RouteStatus } from "../components/ui";
import { localizedPath } from "../layout";
import { Capture } from "./Capture";
import { sectionClass } from "./SectionHead";
import { Pair } from "./TrackSection";

const states: RouteStatus[] = ["clear", "toVerify", "broken"];

/** The itineraries: the three states of a sheet, with a capture of the real catalogue. */
export function RoutesSection({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  const link = <a href={localizedPath(language, "/routes")}>{t("routes.browse")}</a>;
  const figure = (
    <Capture name="routes" alt={t("routes.alt")} wide={[760, 760]} phone={[360, 640]} />
  );
  return (
    <section id="routes" aria-labelledby="routes-title" class={sectionClass}>
      <Pair
        id="routes-title"
        title={t("routes.title")}
        body={t("routes.body")}
        link={link}
        figure={figure}
      />
      <ul
        aria-label={t("routes.states")}
        class="grid grid-cols-[minmax(0,1fr)] border-t border-rule md:grid-cols-3"
      >
        {states.map((state) => (
          <li
            key={state}
            class="border-b border-rule py-5 last:border-b-0 md:border-b-0 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0"
          >
            <StatusBadge status={state} />
            <p class="mt-3">{t(`routes.${state}`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
