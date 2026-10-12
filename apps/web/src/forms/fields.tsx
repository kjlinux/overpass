import { fieldMessage } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../app/useLanguage";
import { Field, Select, TextInput } from "../components/ui";
import type { SelectOption } from "../components/ui";
import type { FieldBinding } from "./useForm";

/** Anything that can bind a field by name, such as the object returned by useForm. */
export type Bindable = { bind: (name: string) => FieldBinding };

type Common = { id: string; label: string; help?: string; form: Bindable };

function useErrorText(binding: FieldBinding): string | undefined {
  const language = useLanguage();
  if (binding.error === undefined) return undefined;
  return binding.error.message ?? fieldMessage(binding.error.code, language);
}

export type TextFieldProps = Common & {
  type?: "text" | "email" | "password";
  autocomplete?: string;
};

export function TextField(props: TextFieldProps): JSX.Element {
  const { id, label, help, form, type = "text", autocomplete } = props;
  const binding = form.bind(id);
  const error = useErrorText(binding);
  return (
    <Field
      id={id}
      label={label}
      {...(help === undefined ? {} : { help })}
      {...(error === undefined ? {} : { error })}
    >
      {(control) => (
        <TextInput
          {...control}
          name={id}
          // Preact narrows input props per type value; these three share the same attributes.
          {...({ type } as { type: "text" })}
          autocomplete={autocomplete}
          value={binding.value}
          onInput={binding.onInput}
          onBlur={binding.onBlur}
          spellcheck={false}
        />
      )}
    </Field>
  );
}

export type SelectFieldProps = Common & { options: SelectOption[] };

/** A select whose first option asks for a choice, so nothing is preselected by accident. */
export function SelectField({ id, label, help, form, options }: SelectFieldProps): JSX.Element {
  const { t } = useTranslation("ui");
  const binding = form.bind(id);
  const error = useErrorText(binding);
  return (
    <Field
      id={id}
      label={label}
      {...(help === undefined ? {} : { help })}
      {...(error === undefined ? {} : { error })}
    >
      {(control) => (
        <Select
          {...control}
          name={id}
          value={binding.value}
          onChange={binding.onInput}
          onBlur={binding.onBlur}
          options={[{ value: "", label: t("choose") }, ...options]}
        />
      )}
    </Field>
  );
}
