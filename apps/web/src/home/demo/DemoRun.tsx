import type { Language } from "@overpass/shared";
import type { TFunction } from "i18next";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import { localizedPath } from "../../layout";
import { DemoStage, StageBody } from "./DemoStage";
import { excerpt, stagesOf } from "./stages";
import { useDemoRun } from "./useDemoRun";

const requestKeys = ["amount", "currency", "client_reference"];
const responseKeys = ["id", "checkout_status", "payment_status"];

type Run = ReturnType<typeof useDemoRun>;

function liveText(run: Run, t: TFunction): string {
  const stages = stagesOf(run.event, run.busy);
  if (run.failed) return t("demo.live.failed");
  if (stages.webhook === "done") return t("demo.live.webhook");
  if (stages.webhook === "failed") return t("demo.live.webhookFailed");
  if (run.event !== undefined)
    return t("demo.live.response", { status: run.event.response.status });
  return run.busy ? t("demo.live.request") : t("demo.idle");
}

type Body = { line: string; body?: string } | undefined;

/** What each finished step shows, read from the event the simulator returned. */
function bodiesOf(run: Run, receiver: string): [Body, Body, Body] {
  const { event } = run;
  if (event === undefined) return [undefined, undefined, undefined];
  const delivery = event.deliveries[0];
  const landed = delivery !== undefined && stagesOf(event, false).webhook !== "pending";
  return [
    {
      line: `${event.request.method} ${event.request.path}`,
      body: excerpt(event.request.body, requestKeys),
    },
    { line: String(event.response.status), body: excerpt(event.response.body, responseKeys) },
    landed
      ? {
          line: delivery.eventType,
          body: `${receiver} ${String(delivery.responseStatus ?? "")}`.trim(),
        }
      : undefined,
  ];
}

function Stages({ run }: { run: Run }): JSX.Element {
  const { t } = useTranslation();
  const stages = stagesOf(run.event, run.busy);
  const bodies = bodiesOf(run, t("demo.receiver"));
  const webhookTitle = stages.webhook === "failed" ? "webhookFailed" : "webhook";
  const steps = [
    { key: "request", title: "request", state: stages.request, elapsed: undefined },
    { key: "response", title: "response", state: stages.response, elapsed: run.timings.response },
    { key: "webhook", title: webhookTitle, state: stages.webhook, elapsed: run.timings.webhook },
  ];
  return (
    <ol class="grid grid-cols-[minmax(0,1fr)] border-t border-rule md:grid-cols-3">
      {steps.map((step, index) => {
        const body = bodies[index];
        return (
          <DemoStage
            key={step.key}
            title={t(`demo.stages.${step.title}`)}
            state={step.state}
            elapsed={step.elapsed}
          >
            {body === undefined ? null : <StageBody {...body} />}
          </DemoStage>
        );
      })}
    </ol>
  );
}

/** The embedded demo: one button, the three states read from the real simulator. */
export function DemoRun({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation();
  const run = useDemoRun();
  return (
    <div>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule py-5">
        <Button data-demo-run loading={run.busy} onClick={() => void run.start()}>
          {run.event === undefined ? t("demo.run") : t("demo.rerun")}
        </Button>
        <p role="status" class="text-caption text-ink-2">
          {liveText(run, t)}
        </p>
      </div>
      <Stages run={run} />
      <p class="border-t border-rule py-5">
        {t("demo.more")} <a href={localizedPath(language, "/sandbox")}>{t("demo.open")}</a>
      </p>
    </div>
  );
}
