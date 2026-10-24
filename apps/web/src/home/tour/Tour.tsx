import "./tour.css";
import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Operators } from "../operators/Operators";
import { sectionClass } from "../SectionHead";
import { tourBlocks } from "./blocks";
import { TourBlock } from "./TourBlock";

/** A guided tour of every module, each shown at work in its own small screen. */
export function Tour({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <section id="tour" aria-labelledby="tour-title" class={sectionClass}>
      <h2 id="tour-title" class="py-6 text-h2 font-semibold">
        {t("tour.title")}
      </h2>
      {tourBlocks.map((block, index) => (
        <TourBlock key={block.key} block={block} index={index} language={language} />
      ))}
      <Operators />
    </section>
  );
}
