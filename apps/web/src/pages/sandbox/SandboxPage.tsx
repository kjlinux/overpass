import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useEffect } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Notification } from "../../components/ui";
import { Layout } from "../../layout";
import { SandboxForm } from "./SandboxForm";
import { SandboxHistory } from "./SandboxHistory";
import { SandboxKeyCard } from "./SandboxKeyCard";
import { SandboxResults } from "./SandboxResults";
import { useSandbox } from "./useSandbox";

function SandboxHeader(): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <div class="flex flex-col gap-2 border-b border-rule pb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-h1 font-bold tracking-tight text-ink">{t("title")}</h1>
        <span class="bg-accent-surface text-accent font-semibold text-caption px-2.5 py-0.5">
          {t("quickDemo")}
        </span>
      </div>
      <p class="text-body text-ink-2 max-w-prose">{t("intro")}</p>
    </div>
  );
}

function SandboxBody({ state }: { state: ReturnType<typeof useSandbox> }): JSX.Element {
  return (
    <div class="grid gap-8 lg:grid-cols-2 items-start">
      <div class="border border-rule bg-paper p-6 shadow-sm">
        <SandboxForm
          provider={state.provider}
          scenario={state.scenario}
          amount={state.amount}
          currency={state.currency}
          webhookUrl={state.webhookUrl}
          secret={state.secret}
          loading={state.loading}
          onProviderChange={state.setProviderId}
          onScenarioChange={state.setScenario}
          onAmountChange={state.setAmount}
          onCurrencyChange={state.setCurrency}
          onWebhookUrlChange={state.setWebhookUrl}
          onSecretChange={state.setSecret}
          onSubmit={() => {
            void state.simulate();
          }}
        />
      </div>

      <div class="flex flex-col gap-6">
        <SandboxResults provider={state.provider} result={state.result} />
        <SandboxHistory events={state.events} />
      </div>
    </div>
  );
}

export function SandboxPage(): JSX.Element {
  const language = useLanguage();
  const { url } = useLocation();
  const searchParams = new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?")) : "");
  const serviceParam = searchParams.get("service");
  const initialProvider = serviceParam === "cinetpay" ? "cinetpay" : "wave";

  const state = useSandbox(initialProvider);

  useEffect(() => {
    if (serviceParam === "cinetpay" || serviceParam === "wave") {
      state.setProviderId(serviceParam);
    }
  }, [serviceParam, state.setProviderId]);

  return (
    <Layout language={language}>
      <div class="flex flex-col gap-8 py-8 md:py-12">
        <SandboxHeader />
        {state.error !== null ? (
          <Notification variant="danger" onDismiss={state.clearError}>
            {state.error}
          </Notification>
        ) : null}
        <SandboxKeyCard
          keyRecord={state.keyRecord}
          loading={state.loading}
          onGenerate={() => {
            void state.generateKey();
          }}
        />
        <SandboxBody state={state} />
      </div>
    </Layout>
  );
}
