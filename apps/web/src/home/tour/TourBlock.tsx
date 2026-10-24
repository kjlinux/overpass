import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { localizedPath } from "../../layout";
import { ArticleScreen } from "./screens/ArticleScreen";
import { BarsScreen } from "./screens/BarsScreen";
import { LineScreen } from "./screens/LineScreen";
import { ThreadScreen } from "./screens/ThreadScreen";
import { TrackScreen } from "./screens/TrackScreen";
import type { TourBlock as Block } from "./blocks";

function ScreenOf({ block }: { block: Block }): JSX.Element {
  if (block.screen === "track") return <TrackScreen />;
  if (block.screen === "article") return <ArticleScreen />;
  if (block.screen === "thread") return <ThreadScreen />;
  if (block.screen === "bars") return <BarsScreen block={block.key} />;
  return <LineScreen block={block.key} />;
}

type Props = { block: Block; index: number; language: Language };

/** Text and screen side by side from 1024 px, alternating sides; stacked, text first, below. */
export function TourBlock({ block, index, language }: Props): JSX.Element {
  const { t } = useTranslation("home");
  const id = `tour-${block.key}`;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      class="tour-block grid items-center gap-8 border-t border-rule py-12 md:py-16 lg:grid-cols-2 lg:gap-16"
    >
      <div class={index % 2 === 1 ? "lg:order-2" : ""}>
        <p class="m-0 font-code text-caption text-accent">
          {t("tour.kicker", {
            n: String(index + 1).padStart(2, "0"),
            name: t(`tour.${block.key}.kicker`),
          })}
        </p>
        <h3 id={`${id}-title`} class="mt-3 text-h2 font-semibold">
          {t(`tour.${block.key}.title`)}
        </h3>
        <p class="mt-4 max-w-[56ch]">{t(`tour.${block.key}.body`)}</p>
        <p class="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {block.links.map((link) => (
            <a
              key={link.key}
              class="inline-flex min-h-tap items-center font-medium"
              href={localizedPath(language, link.path)}
            >
              {t(`tour.${block.key}.links.${link.key}`)}
            </a>
          ))}
        </p>
      </div>
      <ScreenOf block={block} />
    </section>
  );
}
