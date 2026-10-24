import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { localizedPath } from "../layout";
import { Operators } from "./operators/Operators";
import { SectionHead, sectionClass } from "./SectionHead";

const cases = ["success", "insufficient", "duplicate", "late"] as const;

/** The test track: what it replays, the cases and the simulated operators read from the API. */
export function TrackSection({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <section id="track" aria-labelledby="track-title" class={sectionClass}>
      <SectionHead id="track-title" title={t("track.title")} intro={t("track.body")} />
      <ul
        aria-label={t("track.cases")}
        class="home-strip4 grid grid-cols-[minmax(0,1fr)] border-t border-rule"
      >
        {cases.map((item) => (
          <li key={item} class="border-b border-rule py-5">
            <h3 class="mb-2 text-h3 font-semibold">{t(`track.${item}.title`)}</h3>
            <p class="font-code text-code [overflow-wrap:anywhere]">{t(`track.${item}.code`)}</p>
          </li>
        ))}
      </ul>
      <Operators />
      <p class="border-t border-rule pt-6">
        <a href={localizedPath(language, "/sandbox")}>{t("track.open")}</a>
      </p>
    </section>
  );
}
