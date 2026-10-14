import type { SandboxEvent, Scenario } from "@overpass/shared";
import { demoScenarios } from "@overpass/shared";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { apiRequest } from "../../session";
import { Deliveries } from "./Deliveries";
import { Inspector } from "./Inspector";
import { ScenarioPanel } from "./ScenarioPanel";

const pollMs = 1000;
const pollLimit = 90;

const settled = (event: SandboxEvent) =>
  event.deliveries.every(
    (delivery) => delivery.status === "delivered" || delivery.status === "failed",
  );

/** Starts a demo and follows its event until every webhook has landed in the built-in receiver. */
function useDemo() {
  const [event, setEvent] = useState<SandboxEvent>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = event?.id;
  useEffect(() => {
    if (id === undefined) return undefined;
    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      void apiRequest<SandboxEvent>("GET", `/v1/sandbox/demo/events/${id}`).then(({ data }) => {
        if (data !== null) setEvent(data);
        if (polls >= pollLimit || (data !== null && settled(data))) clearInterval(timer);
      });
    }, pollMs);
    return () => {
      clearInterval(timer);
    };
  }, [id]);
  const start = async (scenario: Scenario) => {
    setBusy(true);
    const { data } = await apiRequest<SandboxEvent>("POST", "/v1/sandbox/demo", { scenario });
    setBusy(false);
    setFailed(data === null);
    if (data !== null) setEvent(data);
  };
  return { event, busy, failed, start };
}

type ControlsProps = {
  scenario: Scenario;
  onScenario: (scenario: Scenario) => void;
  busy: boolean;
  status: string | null;
  onStart: () => void;
};

function Controls({ scenario, onScenario, busy, status, onStart }: ControlsProps): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <div class="lg:border-r lg:border-rule lg:pr-8">
      <ScenarioPanel
        scenarios={demoScenarios}
        value={scenario}
        onChange={onScenario}
        title={t("demo.scenarios")}
      />
      <div class="space-y-3 py-6">
        <Button variant="primary" class="w-full" loading={busy} onClick={onStart}>
          {t("demo.button")}
        </Button>
        <p role="status" class="text-caption text-ink-2">
          {status}
        </p>
      </div>
    </div>
  );
}

/** The public demo: one provider, three scenarios, the webhook in sight within seconds. */
export function DemoPage(): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();
  const [scenario, setScenario] = useState<Scenario>("success");
  const { event, busy, failed, start } = useDemo();
  const status = event === undefined ? null : settled(event) ? t("demo.done") : t("demo.waiting");
  return (
    <Layout language={language}>
      <div class="max-w-prose border-b border-rule py-8">
        <h1 class="text-h1 font-semibold md:text-[40px]">{t("demo.title")}</h1>
        <p class="mt-3">{t("demo.intro")}</p>
      </div>
      <div class="grid lg:grid-cols-[400px_minmax(0,1fr)]">
        <Controls
          scenario={scenario}
          onScenario={setScenario}
          busy={busy}
          status={failed ? t("demo.failed") : status}
          onStart={() => void start(scenario)}
        />
        <div class="pt-6 lg:pl-8">
          <Inspector event={event} justRan={event !== undefined} />
          <Deliveries event={event} />
          <p class="py-6">
            {t("demo.more")} <a href={localizedPath(language, "/sandbox")}>{t("title")}</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
