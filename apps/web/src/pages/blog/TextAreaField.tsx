import { fieldMessage } from "@overpass/shared";
import type { JSX } from "preact";
import { useLanguage } from "../../app/useLanguage";
import { Field, Textarea } from "../../components/ui";
import type { Bindable } from "../../forms";

export type TextAreaFieldProps = {
  id: string;
  label: string;
  help?: string;
  form: Bindable;
  rows?: number;
};

/** A textarea bound to a form, with the field's translated error under it. */
export function TextAreaField({
  id,
  label,
  help,
  form,
  rows = 6,
}: TextAreaFieldProps): JSX.Element {
  const language = useLanguage();
  const binding = form.bind(id);
  const issue = binding.error;
  const error =
    issue === undefined ? undefined : (issue.message ?? fieldMessage(issue.code, language));
  return (
    <Field
      id={id}
      label={label}
      {...(help === undefined ? {} : { help })}
      {...(error === undefined ? {} : { error })}
    >
      {(control) => (
        <Textarea
          {...control}
          name={id}
          rows={rows}
          value={binding.value}
          onInput={binding.onInput}
          onBlur={binding.onBlur}
        />
      )}
    </Field>
  );
}
