import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { localizedPath } from "../layout";
import { Capture } from "./Capture";
import { sectionClass } from "./SectionHead";

const cases = ["success", "insufficient", "duplicate", "late"] as const;
const operators = ["wave", "pispi", "paydunya"] as const;

/** Text left, capture right from 1024 px; the shared shape of the track and itinerary sections. */
export function Pair(props: {
  id: string;
  title: string;
  body: string;
  link: JSX.Element;
  figure: JSX.Element;
}): JSX.Element {
  return (
    <div class="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[4fr_8fr]">
      <div class="py-6 lg:pr-8">
        <h2 id={props.id} class="text-h2 font-semibold">
          {props.title}
        </h2>
        <p class="mt-3">{props.body}</p>
        <p class="mt-4">{props.link}</p>
      </div>
      <div class="pb-6 lg:border-l lg:border-rule lg:py-6 lg:pl-8">{props.figure}</div>
    </div>
  );
}

function Operators(): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <div class="border-t border-rule">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
        <h3 class="text-caption font-medium text-ink-2">{t("track.operators")}</h3>
        <span class="inline-flex min-h-7 items-center border border-rule-strong px-2 text-caption font-medium text-ink-2">
          {t("track.unofficial")}
        </span>
      </div>
      <ul class="grid border-t border-rule md:grid-cols-3">
        {operators.map((operator) => (
          <li
            key={operator}
            class="flex items-baseline justify-between gap-4 border-b border-rule py-4 md:flex-col md:border-b-0 md:border-l md:px-6 md:py-5 md:first:border-l-0 md:first:pl-0"
          >
            <strong class="home-operator">{t(`track.${operator}.name`)}</strong>
            <span class="text-caption text-ink-2">{t(`track.${operator}.kind`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The test track: what it replays, a real capture, the cases and the three simulated operators. */
export function TrackSection({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  const link = <a href={localizedPath(language, "/sandbox")}>{t("track.open")}</a>;
  const figure = (
    <Capture
      name="track"
      alt={t("track.alt")}
      caption={t("track.caption")}
      wide={[760, 980]}
      phone={[360, 640]}
    />
  );
  return (
    <section id="track" aria-labelledby="track-title" class={sectionClass}>
      <Pair
        id="track-title"
        title={t("track.title")}
        body={t("track.body")}
        link={link}
        figure={figure}
      />
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
    </section>
  );
}
