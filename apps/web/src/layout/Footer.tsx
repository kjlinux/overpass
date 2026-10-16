import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { SubscribeForm } from "../newsletter";
import { localizedPath } from "./nav";

type LinkGroup = { key: "product" | "community" | "legal"; links: { key: string; path: string }[] };

const groups: LinkGroup[] = [
  {
    key: "product",
    links: [
      { key: "routes", path: "/routes" },
      { key: "sandbox", path: "/sandbox" },
      { key: "pricing", path: "/pricing" },
      { key: "docs", path: "/docs" },
    ],
  },
  {
    key: "community",
    links: [
      { key: "discussions", path: "/discussions" },
      { key: "blog", path: "/blog" },
      { key: "ranking", path: "/ranking" },
      { key: "simulators", path: "/simulator-requests" },
      { key: "propose", path: "/services/propose" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "about", path: "/about" },
      { key: "legal", path: "/legal" },
      { key: "privacy", path: "/privacy" },
    ],
  },
];

/** Surface-coloured footer: newsletter first, then three ruled link columns. */
export function Footer({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("layout");
  return (
    <footer class="border-t border-rule bg-surface py-16">
      <div class="mx-auto max-w-frame px-4 md:px-6 lg:px-8">
        <div class="border-b border-rule pb-8">
          <SubscribeForm language={language} variant="footer" />
        </div>
        <div class="grid pt-8 md:grid-cols-3">
          {groups.map((group) => (
            <section
              key={group.key}
              class="border-b border-rule py-4 last:border-b-0 md:border-b-0 md:border-r md:px-4 md:py-0 md:first:pl-0 md:last:border-r-0"
            >
              <h2 class="mb-2 text-body font-semibold">{t(`groups.${group.key}`)}</h2>
              <ul class="m-0 list-none p-0">
                {group.links.map((link) => (
                  <li key={link.key}>
                    <a
                      href={localizedPath(language, link.path)}
                      class="inline-flex min-h-tap min-w-tap items-center text-ink"
                    >
                      {t(`links.${link.key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p class="mt-8 border-t border-rule pt-4 text-caption text-ink-2">{t("legalLine")}</p>
      </div>
    </footer>
  );
}
