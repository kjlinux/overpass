import { countryName, languageNames } from "@overpass/shared";
import type { RouteDetail } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { StatusBadge } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate, statusOf } from "./format";
import { stackName } from "./RouteCard";

function Fact({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="min-w-0 border-b border-rule px-2 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:first:pl-0 lg:last:border-r-0">
      <dt class="text-caption font-medium text-ink-2">{label}</dt>
      <dd class="m-0 font-semibold [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function Facts({ route }: { route: RouteDetail }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const author =
    route.author === "" ? (
      t("detail.deletedAuthor")
    ) : (
      <a href={localizedPath(language, `/members/${route.author}`)}>{route.author}</a>
    );
  const version = { version: route.version, date: formatDate(route.updatedAt, language) };
  return (
    <dl class="m-0 grid grid-cols-2 border-y border-rule sm:grid-cols-3 lg:grid-cols-6">
      <Fact label={t("detail.facts.service")}>{route.service.name}</Fact>
      <Fact label={t("detail.facts.country")}>{countryName(route.country, language)}</Fact>
      <Fact label={t("detail.facts.stack")}>{stackName(route.stack)}</Fact>
      <Fact label={t("detail.facts.language")}>{languageNames[route.language]}</Fact>
      <Fact label={t("detail.facts.author")}>{author}</Fact>
      <Fact label={t("detail.facts.version")}>{t("detail.facts.versionValue", version)}</Fact>
    </dl>
  );
}

/** Trail, the single state badge, the title, the language fallback notice and the facts strip. */
export function RouteHead({ route }: { route: RouteDetail }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const catalogue = localizedPath(language, "/routes");
  return (
    <header class="pb-6 pt-6">
      <nav aria-label={t("detail.trail")} class="text-caption text-ink-2">
        <ol class="m-0 flex list-none flex-wrap gap-2 p-0">
          <li>
            <a class="text-ink-2" href={catalogue}>
              {t("catalogue.title")}
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <a class="text-ink-2" href={`${catalogue}?service=${route.service.slug}`}>
              {route.service.name}
            </a>
          </li>
        </ol>
      </nav>
      <div class="mt-4">
        <StatusBadge status={statusOf(route.state)} />
      </div>
      <h1 class="mt-3 max-w-[28ch] text-h1 font-semibold [overflow-wrap:anywhere] md:text-display">
        {route.title}
      </h1>
      {route.fallback ? (
        <p role="note" class="mt-4 max-w-prose border border-rule-strong bg-surface px-4 py-3">
          {t("detail.fallback", { language: languageNames[route.language] })}
        </p>
      ) : null}
      <div class="mt-6">
        <Facts route={route} />
      </div>
    </header>
  );
}
