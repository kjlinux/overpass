import { Copy } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import {
  Button,
  Choice,
  Field,
  IconButton,
  Select,
  TextInput,
  Textarea,
} from "../../components/ui";
import { Section } from "./Section";

/** Buttons in every variant and state. */
export function ButtonsSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  return (
    <Section id="buttons" title={t("buttons.title")}>
      <div class="flex flex-wrap items-center gap-4">
        <Button variant="primary">{t("buttons.primary")}</Button>
        <Button>{t("buttons.secondary")}</Button>
        <Button variant="ghost">{t("buttons.ghost")}</Button>
        <Button variant="danger">{t("buttons.danger")}</Button>
        <Button loading>{t("buttons.loading")}</Button>
        <Button disabled>{t("buttons.disabled")}</Button>
        <IconButton label={t("buttons.copy")}>
          <Copy class="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
    </Section>
  );
}

/** Radio and checkbox rows of the scenario fieldset. */
function ScenarioChoices(): JSX.Element {
  const { t } = useTranslation("showcase");
  return (
    <fieldset class="border-t border-rule">
      <legend class="mb-2 font-semibold">{t("fields.scenario")}</legend>
      <Choice type="radio" name="scenario" value="success" label={t("fields.success")} checked />
      <Choice type="radio" name="scenario" value="timeout" label={t("fields.timeout")} />
      <Choice type="checkbox" name="newsletter" label={t("fields.newsletter")} />
    </fieldset>
  );
}

/** Text input, select, textarea, an error state and a radio group. */
export function FieldsSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  const operators = ["wave", "cinetpay", "pispi", "paydunya"];
  return (
    <Section id="fields" title={t("fields.title")}>
      <form
        class="grid max-w-prose gap-6"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <Field id="demo-amount" label={t("fields.amount")} help={t("fields.amountHelp")}>
          {(control) => <TextInput {...control} inputMode="numeric" value="2 500" />}
        </Field>
        <Field id="demo-operator" label={t("fields.operator")}>
          {(control) => (
            <Select
              {...control}
              options={operators.map((value) => ({ value, label: t(`fields.operators.${value}`) }))}
            />
          )}
        </Field>
        <Field id="demo-webhook" label={t("fields.webhook")} error={t("fields.webhookError")}>
          {(control) => <TextInput {...control} type="url" value="http://localhost:3000/hook" />}
        </Field>
        <Field id="demo-notes" label={t("fields.notes")}>
          {(control) => <Textarea {...control} />}
        </Field>
        <ScenarioChoices />
      </form>
    </Section>
  );
}
