import type { SandboxKey, SandboxProvider } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, CodeBlock } from "../../components/ui";
import { curlOf, relayCommand } from "./command";
import { Section } from "./parts";

export type PlayStep = (
  step: string,
  vars: Record<string, string>,
) => Promise<{ vars: Record<string, string>; status: number } | undefined>;

type Props = {
  provider: SandboxProvider;
  item: SandboxKey;
  secret: string | undefined;
  origin: string;
  onPlay: PlayStep;
};

type StepProps = {
  number: number;
  title: string;
  isCode?: boolean;
  summary: string;
  code: string;
  status: number | undefined;
  onPlay?: () => void;
};

function Step({
  number,
  title,
  isCode = false,
  summary,
  code,
  status,
  onPlay,
}: StepProps): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <li class="border-b border-rule py-4">
      <h3 class="flex flex-wrap items-baseline gap-x-3 font-semibold">
        <span>{t("guided.step", { number })}</span>
        <span class={isCode ? "font-code text-caption" : ""}>{title}</span>
      </h3>
      <p class="mt-1 text-caption text-ink-2">{summary}</p>
      <div class="mt-3">
        <CodeBlock code={code} language={t("guided.copy")} />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        {onPlay === undefined ? null : (
          <Button variant="secondary" onClick={onPlay}>
            {t("guided.play")}
          </Button>
        )}
        {status === undefined ? null : (
          <span role="status" class="font-code text-caption">
            {t("guided.result", { status })}
          </span>
        )}
      </div>
    </li>
  );
}

/** The provider's walkthrough, one copyable call per step, each playable from the page. */
export function GuidedDemo({ provider, item, secret, origin, onPlay }: Props): JSX.Element | null {
  const { t } = useTranslation("sandbox");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, number>>({});
  if (provider.steps.length < 2) return null;
  const key = secret ?? `${item.prefix}...`;
  const play = async (step: string) => {
    const result = await onPlay(step, vars);
    if (result === undefined) return;
    setVars({ ...vars, ...result.vars });
    setStatuses({ ...statuses, [step]: result.status });
  };
  const shared = { origin, provider: provider.id, auth: provider.auth, key, vars };
  return (
    <Section id="sandbox-guided" title={t("guided.heading")}>
      <p>{t("guided.intro", { count: provider.steps.length + 1 })}</p>
      <ol class="mt-4 border-t border-rule">
        {provider.steps.map((step, index) => (
          <Step
            key={step.id}
            number={index + 1}
            title={`${step.method} ${step.path}`}
            isCode
            summary={step.summary ?? ""}
            code={curlOf({ ...shared, step })}
            status={statuses[step.id]}
            onPlay={() => void play(step.id)}
          />
        ))}
        <Step
          number={provider.steps.length + 1}
          title={t("guided.webhookTitle")}
          summary={t("guided.webhook")}
          code={relayCommand({ origin, key })}
          status={undefined}
        />
      </ol>
    </Section>
  );
}
