import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Layout } from "../../layout";
import { McpConfigTabs } from "../../mcp";
import { ApiReference } from "./ApiReference";
import { DocSection } from "./DocSection";
import { ExampleSection } from "./ExampleSection";
import { QuickStart } from "./QuickStart";
import { ToolsTable } from "./ToolsTable";

const sections = ["start", "editors", "tools", "example", "api"] as const;

function PageIndex(): JSX.Element {
  const { t } = useTranslation("docs");
  return (
    <nav aria-labelledby="docs-toc" class="lg:sticky lg:top-24 lg:self-start">
      <h2 id="docs-toc" class="text-caption font-medium text-ink-2">
        {t("toc")}
      </h2>
      <ul class="mt-2 border-y border-rule">
        {sections.map((section) => (
          <li key={section} class="border-t border-rule first:border-t-0">
            <a class="flex min-h-tap items-center" href={`#${section}`}>
              {t(`sections.${section}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Quick start, editor setup, tools, a worked example and the simulator reference. */
export function DocsPage(): JSX.Element {
  const { t } = useTranslation("docs");
  const language = useLanguage();
  return (
    <Layout language={language}>
      <div class="py-12 md:py-16">
        <h1 class="text-h1 font-semibold">{t("title")}</h1>
        <p class="mt-2 max-w-prose text-ink-2">{t("intro")}</p>
        <div class="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <PageIndex />
          <div class="flex min-w-0 flex-col gap-12">
            <DocSection id="start" title={t("sections.start")}>
              <QuickStart />
            </DocSection>
            <DocSection id="editors" title={t("sections.editors")}>
              <p class="max-w-prose">{t("editors.intro")}</p>
              <McpConfigTabs />
              <p class="max-w-prose">{t("editors.readOnly")}</p>
            </DocSection>
            <DocSection id="tools" title={t("sections.tools")}>
              <ToolsTable />
            </DocSection>
            <DocSection id="example" title={t("sections.example")}>
              <ExampleSection />
            </DocSection>
            <DocSection id="api" title={t("sections.api")}>
              <ApiReference />
            </DocSection>
          </div>
        </div>
      </div>
    </Layout>
  );
}
