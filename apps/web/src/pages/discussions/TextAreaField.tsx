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
  code?: boolean;
};

/** A bound textarea; code fields use the mono face and never wrap or autocorrect. */
export function TextAreaField(props: TextAreaFieldProps): JSX.Element {
  const { id, label, help, form, rows = 6, code = false } = props;
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
          class={code ? "font-code text-code" : ""}
          value={binding.value}
          onInput={binding.onInput}
          onBlur={binding.onBlur}
          spellcheck={!code}
          wrap={code ? "off" : "soft"}
        />
      )}
    </Field>
  );
}
