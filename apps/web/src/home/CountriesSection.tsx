import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { buttonClass } from "../components/ui";
import { localizedPath } from "../layout";
import { Atlas, StatsSkeleton } from "./figures/Atlas";
import { Figures } from "./figures/Figures";
import { useStats } from "./figures/useStats";
import { statsView } from "./figures/view";
import { SectionHead, sectionClass } from "./SectionHead";

function SignUp({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <div class={`${sectionClass} flex flex-wrap items-center justify-between gap-4 py-6`}>
      <p class="max-w-[24ch] text-[clamp(22px,3vw,32px)] font-semibold leading-tight">
        {t("signup.text")}
      </p>
      <a class={buttonClass("secondary")} href={localizedPath(language, "/sign-up")}>
        {t("signup.button")}
      </a>
    </div>
  );
}

/** Countries and real figures when the API has them, nothing otherwise; the sign-up call always closes the page. */
export function CountriesSection({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  const view = statsView(useStats());
  return (
    <>
      {view.kind === "hidden" ? null : (
        <section id="countries" aria-labelledby="countries-title" class={sectionClass}>
          <SectionHead id="countries-title" title={t("countries.title")} />
          {view.kind === "loading" ? <StatsSkeleton /> : null}
          {view.kind === "shown" && view.tiles ? (
            <div class="border-t border-rule py-6">
              <Atlas countries={view.stats.countries} language={language} />
            </div>
          ) : null}
          {view.kind === "shown" ? <Figures stats={view.stats} language={language} /> : null}
        </section>
      )}
      <SignUp language={language} />
    </>
  );
}
