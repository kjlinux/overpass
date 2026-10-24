import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { localizedPath } from "../../layout";
import { SectionHead, sectionClass } from "../SectionHead";
import { features } from "./features";

/** Every module in one ruled grid, each cell a link with one concrete sentence. */
export function FeaturesSection({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <section id="features" aria-labelledby="features-title" class={sectionClass}>
      <SectionHead id="features-title" title={t("features.title")} intro={t("features.intro")} />
      <ul class="home-grid3 grid grid-cols-[minmax(0,1fr)] border-t border-rule">
        {features.map(({ key, path, icon: Icon }) => (
          <li key={key} class="border-b border-rule">
            <a
              href={localizedPath(language, path)}
              class="group flex h-full gap-4 py-5 text-ink no-underline hover:bg-surface md:px-5"
            >
              <span class="mt-1 shrink-0 text-accent">
                <Icon size={20} aria-hidden={true} />
              </span>
              <span>
                <span class="block text-h3 font-semibold underline-offset-4 group-hover:underline">
                  {t(`features.items.${key}.title`)}
                </span>
                <span class="mt-1 block text-ink-2">{t(`features.items.${key}.body`)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
