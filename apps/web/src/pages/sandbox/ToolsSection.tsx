import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { CodeBlock } from "../../components/ui";
import { localizedPath } from "../../layout";
import { McpConfigTabs } from "../../mcp";
import { relayCommand } from "./command";
import { Guide } from "./Guide";
import type { GuideStep } from "./Guide";

const placeholderKey = "ovp_test_...";
const cliSteps = ["key", "target", "run", "check"] as const;
const mcpSteps = ["token", "config", "ask"] as const;

function useStep(guide: "cli" | "mcp") {
  const { t } = useTranslation("sandbox");
  return (id: string, extra?: ComponentChildren): GuideStep => ({
    id: `${guide}-${id}`,
    title: t(`tools.${guide}.${id}.title`),
    text: t(`tools.${guide}.${id}.text`),
    extra,
  });
}

function CliGuide(): JSX.Element {
  const { t } = useTranslation("sandbox");
  const step = useStep("cli");
  const command = relayCommand({ origin: location.origin, key: placeholderKey });
  const extras = {
    run: <CodeBlock code={command} language={t("tools.cli.terminal")} />,
  } as Record<string, ComponentChildren>;
  const steps = cliSteps.map((id) => step(id, extras[id]));
  return (
    <Guide
      id="sandbox-tools-cli"
      title={t("tools.cli.heading")}
      intro={t("tools.cli.intro")}
      steps={steps}
    />
  );
}

function McpGuide(): JSX.Element {
  const { t } = useTranslation("sandbox");
  const step = useStep("mcp");
  const tokens = localizedPath(useLanguage(), "/settings#tokens");
  const extras = {
    token: (
      <a class="inline-flex min-h-tap items-center self-start" href={tokens}>
        {t("tools.mcp.token.link")}
      </a>
    ),
    config: <McpConfigTabs />,
  } as Record<string, ComponentChildren>;
  const steps = mcpSteps.map((id) => step(id, extras[id]));
  return (
    <Guide
      id="sandbox-tools-mcp"
      title={t("tools.mcp.heading")}
      intro={t("tools.mcp.intro")}
      steps={steps}
    />
  );
}

/** How to receive webhooks on your computer and how to plug a code assistant into the routes. */
export function ToolsSection(): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <section aria-labelledby="sandbox-tools" class="border-t border-rule py-8">
      <h2 id="sandbox-tools" class="text-h2 font-semibold">
        {t("tools.heading")}
      </h2>
      <p class="mt-3 max-w-prose">{t("tools.intro")}</p>
      <div class="mt-8 grid gap-12 lg:grid-cols-2">
        <CliGuide />
        <McpGuide />
      </div>
    </section>
  );
}
