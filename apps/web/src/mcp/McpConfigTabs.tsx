import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../app/useLanguage";
import { CodeBlock, Tabs } from "../components/ui";
import { editorConfigs, mcpUrl } from "./config";
import type { EditorConfigs } from "./config";

const editors = ["claudeCode", "cursor", "vscode"] as const satisfies (keyof EditorConfigs)[];

/** The three editor configurations; without a token, a placeholder shows where it goes. */
export function McpConfigTabs({ token }: { token?: string }): JSX.Element {
  const { t } = useTranslation("mcp");
  const configs = editorConfigs(mcpUrl(location.origin, useLanguage()), token ?? t("placeholder"));
  const tabs = editors.map((editor) => ({
    id: editor,
    label: t(`editors.${editor}`),
    content: (
      <div class="flex flex-col gap-4 p-4">
        <p class="max-w-prose">{t(`where.${editor}`)}</p>
        <CodeBlock code={configs[editor]} language={t(`captions.${editor}`)} />
      </div>
    ),
  }));
  return (
    <div class="flex flex-col gap-4">
      <Tabs id="mcp-config" label={t("tabs")} tabs={tabs} />
      <p class="border border-rule bg-warning-surface p-4">{t("secret")}</p>
    </div>
  );
}
