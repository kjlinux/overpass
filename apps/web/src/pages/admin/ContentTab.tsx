import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { localizedPath } from "../../layout";

/** Paths of the team's own editors, declared in app/contentRoutes.tsx. */
const links = [
  { key: "editor", path: "/blog/write" },
  { key: "newsletter", path: "/admin/newsletter" },
] as const;

export function ContentTab(): JSX.Element {
  const { t } = useTranslation("admin");
  const language = useLanguage();
  return (
    <section aria-labelledby="content-heading" class="px-4 py-8 md:px-6">
      <h2 id="content-heading" class="mb-4 text-h2 font-semibold">
        {t("content.heading")}
      </h2>
      <ul class="m-0 grid list-none border-t border-rule p-0 md:grid-cols-2 md:divide-x md:divide-rule">
        {links.map((link) => (
          <li
            key={link.key}
            class="flex flex-col gap-2 border-b border-rule py-4 md:px-4 md:first:pl-0"
          >
            <a
              class="flex min-h-tap items-center self-start font-semibold"
              href={localizedPath(language, link.path)}
            >
              {t(`content.${link.key}`)}
            </a>
            <p class="m-0 max-w-prose text-ink-2">{t(`content.${link.key}Text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
