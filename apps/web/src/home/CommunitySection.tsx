import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { localizedPath } from "../layout";
import { SubscribeForm } from "../newsletter";
import { SectionHead, sectionClass } from "./SectionHead";

const spaces = [
  { key: "discussions", path: "/discussions" },
  { key: "blog", path: "/blog" },
] as const;

/** Discussions and blog on the left, the newsletter form on the right. */
export function CommunitySection({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  const tl = useTranslation("layout").t;
  return (
    <section id="community" aria-labelledby="community-title" class={sectionClass}>
      <SectionHead id="community-title" title={t("community.title")} />
      <div class="grid grid-cols-[minmax(0,1fr)] border-t border-rule lg:grid-cols-2">
        <ul class="py-6 lg:pr-8">
          {spaces.map((space) => (
            <li key={space.key} class="border-b border-rule py-4 first:pt-0">
              <a class="text-h3 font-semibold" href={localizedPath(language, space.path)}>
                {tl(`links.${space.key}`)}
              </a>
              <p>{t(`community.${space.key}`)}</p>
            </li>
          ))}
        </ul>
        <div class="py-6 lg:border-l lg:border-rule lg:pl-8">
          <p class="mb-4">{t("community.newsletterBody")}</p>
          <SubscribeForm language={language} variant="footer" />
        </div>
      </div>
    </section>
  );
}
