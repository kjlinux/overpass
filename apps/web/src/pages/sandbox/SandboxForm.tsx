import type { SandboxScenario } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, Field, TextInput, cx } from "../../components/ui";
import { providers } from "./types";
import type { ProviderOption } from "./types";

const scenarioKeys: SandboxScenario[] = [
  "payment_success",
  "insufficient_funds",
  "operator_timeout",
  "duplicate_webhook",
  "delayed_webhook",
];

type Props = {
  provider: ProviderOption;
  scenario: SandboxScenario;
  amount: string;
  currency: string;
  webhookUrl: string;
  secret: string;
  loading: boolean;
  onProviderChange: (id: "wave" | "cinetpay") => void;
  onScenarioChange: (s: SandboxScenario) => void;
  onAmountChange: (v: string) => void;
  onCurrencyChange: (v: string) => void;
  onWebhookUrlChange: (v: string) => void;
  onSecretChange: (v: string) => void;
  onSubmit: () => void;
};

function ProviderPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (id: "wave" | "cinetpay") => void;
}): JSX.Element {
  return (
    <div class="flex gap-2 border-b border-rule pb-3">
      {providers.map((p) => {
        const active = p.id === selected;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onChange(p.id);
            }}
            class={cx(
              "px-4 py-2 text-caption font-semibold transition-colors duration-fast",
              active ? "bg-accent text-accent-ink" : "bg-surface text-ink hover:bg-rule",
            )}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

function ScenarioPicker({
  selected,
  onChange,
}: {
  selected: SandboxScenario;
  onChange: (s: SandboxScenario) => void;
}): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <div class="grid gap-2">
      {scenarioKeys.map((s) => {
        const active = s === selected;
        return (
          <button
            key={s}
            type="button"
            onClick={() => {
              onChange(s);
            }}
            class={cx(
              "flex flex-col items-start p-3 text-left border transition-all duration-fast",
              active
                ? "border-accent bg-accent-surface/30 shadow-sm"
                : "border-rule bg-paper hover:bg-surface",
            )}
          >
            <span class="font-semibold text-caption text-ink">{t(`scenarios.${s}`)}</span>
            <span class="text-caption text-ink-2">{t(`scenarios.${s}_desc`)}</span>
          </button>
        );
      })}
    </div>
  );
}

function AmountCurrencyInputs(props: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <div class="grid grid-cols-2 gap-4">
      <Field id="sandbox-amount" label={t("form.amount")}>
        {(ctrl) => (
          <TextInput
            {...ctrl}
            value={props.amount}
            onInput={(e) => {
              props.onAmountChange((e.target as HTMLInputElement).value);
            }}
            required
          />
        )}
      </Field>
      <Field id="sandbox-currency" label={t("form.currency")}>
        {(ctrl) => (
          <TextInput
            {...ctrl}
            value={props.currency}
            onInput={(e) => {
              props.onCurrencyChange((e.target as HTMLInputElement).value);
            }}
            required
          />
        )}
      </Field>
    </div>
  );
}

function WebhookSecretInputs(props: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <div class="flex flex-col gap-4">
      <Field id="sandbox-webhook" label={t("form.webhookUrl")} help={t("form.webhookUrlHint")}>
        {(ctrl) => (
          <TextInput
            {...ctrl}
            type="url"
            placeholder={t("form.webhookPlaceholder")}
            value={props.webhookUrl}
            onInput={(e) => {
              props.onWebhookUrlChange((e.target as HTMLInputElement).value);
            }}
          />
        )}
      </Field>

      <Field id="sandbox-secret" label={t("form.secret")}>
        {(ctrl) => (
          <TextInput
            {...ctrl}
            type="text"
            placeholder={t("form.secretPlaceholder")}
            value={props.secret}
            onInput={(e) => {
              props.onSecretChange((e.target as HTMLInputElement).value);
            }}
          />
        )}
      </Field>
    </div>
  );
}

export function SandboxForm(props: Props): JSX.Element {
  const { t } = useTranslation("sandbox");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
      class="flex flex-col gap-6"
    >
      <div class="flex flex-col gap-2">
        <label class="text-caption font-semibold text-ink">{t("provider")}</label>
        <ProviderPicker selected={props.provider.id} onChange={props.onProviderChange} />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-caption font-semibold text-ink">{t("scenario")}</label>
        <ScenarioPicker selected={props.scenario} onChange={props.onScenarioChange} />
      </div>

      <AmountCurrencyInputs {...props} />
      <WebhookSecretInputs {...props} />

      <Button type="submit" variant="primary" class="w-full" disabled={props.loading}>
        {props.loading ? t("form.simulating") : t("form.simulate")}
      </Button>
    </form>
  );
}
