import type { SandboxKey, SandboxProvider, Scenario } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";

type Props = {
  provider: SandboxProvider;
  scenario: Scenario;
  item: SandboxKey | undefined;
  busy: boolean;
  onRun: () => void;
};

function Recap({
  provider,
  scenario,
  item,
}: Pick<Props, "provider" | "scenario" | "item">): JSX.Element {
  const { t } = useTranslation("sandbox");
  const rows: [string, JSX.Element | string][] = [
    [t("launch.provider"), provider.name],
    [t("launch.scenario"), t(`scenario.${scenario}.label`)],
    [t("launch.key"), item === undefined ? "" : <code>{item.prefix}</code>],
    [t("launch.target"), item === undefined ? "" : t(`target.${item.target}.label`)],
  ];
  return (
    <dl class="grid grid-cols-2 border-l border-t border-rule lg:grid-cols-4">
      {rows.map(([term, value]) => (
        <div key={term} class="min-w-0 border-b border-r border-rule px-3 py-2">
          <dt class="text-caption font-medium text-ink-2">{term}</dt>
          <dd class="font-semibold [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The page's one primary action, preceded by a recap of what it will do. */
export function LaunchBar({ provider, scenario, item, busy, onRun }: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  const example = provider.example;
  const ready = item !== undefined && example !== null;
  const note =
    item === undefined
      ? t("launch.needKey")
      : example === null
        ? ""
        : t("launch.note", { method: example.method, path: example.path });
  return (
    <section aria-labelledby="sandbox-launch" class="border-b border-rule pb-6">
      <h2 id="sandbox-launch" class="sr-only">
        {t("launch.heading")}
      </h2>
      <Recap provider={provider} scenario={scenario} item={item} />
      <div class="mt-4 grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-4">
        <Button
          variant="primary"
          class="w-full lg:w-auto"
          loading={busy}
          aria-disabled={!ready}
          aria-describedby="sandbox-launch-note"
          onClick={() => {
            if (ready) onRun();
          }}
        >
          {t("launch.button")}
        </Button>
        <p id="sandbox-launch-note" class="text-caption text-ink-2">
          {note}
        </p>
      </div>
    </section>
  );
}
