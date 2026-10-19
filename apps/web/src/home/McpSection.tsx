import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { CodeBlock } from "../components/ui";
import { localizedPath } from "../layout";
import { editorConfigs, mcpUrl } from "../mcp";
import { sectionClass } from "./SectionHead";

const editors = ["claudeCode", "cursor", "vscode"] as const;

/** The MCP server in a code assistant: the editors named in text, one real configuration to copy. */
export function McpSection({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("home");
  const origin = typeof location === "undefined" ? "" : location.origin;
  const config = editorConfigs(mcpUrl(origin, language), t("mcp.token")).cursor;
  return (
    <section id="mcp" aria-labelledby="mcp-title" class={sectionClass}>
      <div class="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
        <div class="py-6 lg:pr-8">
          <h2 id="mcp-title" class="text-h2 font-semibold">
            {t("mcp.title")}
          </h2>
          <p class="mt-3">{t("mcp.body")}</p>
          <ul aria-label={t("mcp.editors")} class="mt-4 border-t border-rule">
            {editors.map((editor) => (
              <li key={editor} class="border-b border-rule py-2 font-semibold">
                {t(`mcp.${editor}`)}
              </li>
            ))}
          </ul>
        </div>
        <div class="min-w-0 pb-6 lg:border-l lg:border-rule lg:py-6 lg:pl-8">
          <CodeBlock code={config} language={t("mcp.caption")} />
          <p class="mt-2 text-caption text-ink-2">
            {t("mcp.note")} <a href={localizedPath(language, "/docs")}>{t("mcp.docs")}</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
