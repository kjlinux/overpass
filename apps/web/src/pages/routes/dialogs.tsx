import { checkCreateInput, fieldMessage, potholeCreateInput } from "@overpass/shared";
import type { ApiError, CheckCreateInput, PotholeCreateInput } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Choice, Field, Textarea } from "../../components/ui";
import { SelectField, countryOptions, useForm } from "../../forms";
import type { FieldBinding } from "../../forms";
import { RouteDialog } from "./RouteDialog";

const environments = ["test", "production"] as const;

type DialogProps<Input> = {
  open: boolean;
  onClose: () => void;
  onSend: (input: Input) => Promise<ApiError | undefined>;
};

/** Validates, sends, closes on success and keeps the form open with the error otherwise. */
function useDialogSubmit<Input>(
  validate: () => Input | undefined,
  props: DialogProps<Input>,
  show: (error: ApiError) => void,
) {
  const [busy, setBusy] = useState(false);
  const submit = async (event: Event) => {
    event.preventDefault();
    const input = validate();
    if (input === undefined || busy) return;
    setBusy(true);
    const error = await props.onSend(input);
    setBusy(false);
    if (error === undefined) props.onClose();
    else show(error);
  };
  return { busy, onSubmit: (event: Event) => void submit(event) };
}

function EnvironmentChoices({ binding }: { binding: FieldBinding }): JSX.Element {
  const { t } = useTranslation("routes");
  return (
    <fieldset>
      <legend class="mb-2 font-semibold">{t("dialog.environment")}</legend>
      <div class="border-t border-rule">
        {environments.map((value) => (
          <Choice
            key={value}
            type="radio"
            name="environment"
            value={value}
            label={t(`checks.environment.${value}`)}
            checked={binding.value === value}
            onChange={binding.onInput}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function VerifyDialog(
  props: DialogProps<CheckCreateInput> & { country: string },
): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const form = useForm(checkCreateInput, { country: props.country, environment: environments[0] });
  const { busy, onSubmit } = useDialogSubmit(form.validate, props, form.showApiError);
  const environment = form.bind("environment");
  return (
    <RouteDialog
      {...{ open: props.open, onClose: props.onClose, busy, onSubmit, error: form.formError }}
      title={t("dialog.verifyTitle")}
      text={t("dialog.verifyText")}
      submitLabel={t("dialog.verifySubmit")}
    >
      <SelectField
        id="country"
        label={t("dialog.country")}
        options={countryOptions(language)}
        form={form}
      />
      <EnvironmentChoices binding={environment} />
    </RouteDialog>
  );
}

function DescriptionField({ binding }: { binding: FieldBinding }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const issue = binding.error;
  const error =
    issue === undefined ? {} : { error: issue.message ?? fieldMessage(issue.code, language) };
  return (
    <Field id="description" label={t("dialog.description")} {...error}>
      {(control) => (
        <Textarea
          {...control}
          name="description"
          rows={5}
          value={binding.value}
          onInput={binding.onInput}
          onBlur={binding.onBlur}
        />
      )}
    </Field>
  );
}

export function ReportDialog(props: DialogProps<PotholeCreateInput>): JSX.Element {
  const { t } = useTranslation("routes");
  const form = useForm(potholeCreateInput, { description: "" });
  const { busy, onSubmit } = useDialogSubmit(form.validate, props, form.showApiError);
  const description = form.bind("description");
  return (
    <RouteDialog
      {...{ open: props.open, onClose: props.onClose, busy, onSubmit, error: form.formError }}
      title={t("dialog.reportTitle")}
      text={t("dialog.reportText")}
      submitLabel={t("dialog.reportSubmit")}
    >
      <DescriptionField binding={description} />
    </RouteDialog>
  );
}
