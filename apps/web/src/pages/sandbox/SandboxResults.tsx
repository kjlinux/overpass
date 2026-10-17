import type { TFunction } from "i18next";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Card, CodeBlock, StatusBadge, Tabs, cx } from "../../components/ui";
import type { ProviderOption, SimulationResult } from "./types";

type Props = {
  provider: ProviderOption;
  result: SimulationResult | null;
};

function SignatureRow({ sigName, sigValue }: { sigName: string; sigValue: string }): JSX.Element {
  return (
    <div class="text-caption">
      <span class="font-mono text-ink-2">{sigName}: </span>
      <span class="font-mono text-ink text-[12px] bg-paper px-1.5 py-0.5 border border-rule break-all select-all">
        {sigValue}
      </span>
    </div>
  );
}

function WebhookItem({
  webhook,
  index,
  sigName,
}: {
  webhook: SimulationResult["outcome"]["webhooks"][number];
  index: number;
  sigName: string;
}): JSX.Element {
  const { t } = useTranslation("sandbox");
  const sigValue = webhook.headers[sigName];
  return (
    <div class="flex flex-col gap-2 p-3 bg-surface border border-rule">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="font-semibold text-caption text-ink">
          {t("results.webhookItem", { index: index + 1 })}
        </span>
        <div class="flex items-center gap-2">
          {webhook.duplicateOf !== undefined ? (
            <span class="text-caption font-medium bg-warning-surface text-warning px-2 py-0.5">
              {t("results.duplicate")}
            </span>
          ) : null}
          <span class="text-caption text-ink-2">
            {t("results.delay", { delay: webhook.delayMs })}
          </span>
        </div>
      </div>
      {sigValue !== undefined ? <SignatureRow sigName={sigName} sigValue={sigValue} /> : null}
      <CodeBlock language="json" code={JSON.stringify(webhook.payload, null, 2)} />
    </div>
  );
}

function WebhooksTab({
  webhooks,
  sigName,
}: {
  webhooks: SimulationResult["outcome"]["webhooks"];
  sigName: string;
}): JSX.Element {
  const { t } = useTranslation("sandbox");
  if (webhooks.length === 0) {
    return <p class="text-caption text-ink-2 py-4">{t("results.noWebhooks")}</p>;
  }
  return (
    <div class="flex flex-col gap-4">
      {webhooks.map((wh, idx) => (
        <WebhookItem key={idx} webhook={wh} index={idx} sigName={sigName} />
      ))}
    </div>
  );
}

function buildTabs(t: TFunction, outcome: SimulationResult["outcome"], sigName: string) {
  return [
    {
      id: "response",
      label: t("results.response"),
      content: <CodeBlock language="json" code={JSON.stringify(outcome.response.body, null, 2)} />,
    },
    {
      id: "webhooks",
      label: t("results.webhooks", { count: outcome.webhooks.length }),
      content: <WebhooksTab webhooks={outcome.webhooks} sigName={sigName} />,
    },
  ];
}

export function SandboxResults({ provider, result }: Props): JSX.Element {
  const { t } = useTranslation("sandbox");

  if (result === null) {
    return (
      <Card title={t("results.title")}>
        <p class="text-caption text-ink-2 py-8 text-center">{t("intro")}</p>
      </Card>
    );
  }

  const { outcome } = result;
  const isOk = outcome.response.status >= 200 && outcome.response.status < 300;
  const badgeStatus = isOk ? "clear" : "broken";
  const tabs = buildTabs(t, outcome, provider.signatureHeader);

  return (
    <Card
      title={t("results.title")}
      action={
        <div class="flex items-center gap-2">
          <StatusBadge status={badgeStatus} />
          <span
            class={cx(
              "font-mono font-semibold text-caption px-2 py-0.5",
              isOk ? "bg-success-surface text-success" : "bg-danger-surface text-danger",
            )}
          >
            HTTP {outcome.response.status}
          </span>
        </div>
      }
    >
      <Tabs id="sandbox-result-tabs" label={t("results.title")} tabs={tabs} />
    </Card>
  );
}
