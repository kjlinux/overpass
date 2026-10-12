import type { ApiError } from "@overpass/shared";
import { useState } from "preact/hooks";
import type { z } from "zod";
import { firstInvalid, validateAll, validateField } from "./validation";

type Values = Record<string, string>;

/** A field problem: a validation code, with the server's translated text when it sent one. */
export type FieldIssue = { code: string; message?: string };
type Issues = Record<string, FieldIssue | undefined>;

export type FieldBinding = {
  value: string;
  error: FieldIssue | undefined;
  onInput: (event: Event) => void;
  onBlur: () => void;
};

const issue = (code: string | undefined) => (code === undefined ? undefined : { code });

function focusField(id: string | undefined): void {
  if (id !== undefined) document.getElementById(id)?.focus();
}

/** Validates on blur, then on each keystroke once a field is in error, as DESIGN.md asks. */
export function useForm<Schema extends z.ZodType>(schema: Schema, initial: Values) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Issues>({});
  const [formError, setFormError] = useState<ApiError | undefined>(undefined);
  const check = (name: string, next: Values) => {
    setErrors((current) => ({ ...current, [name]: issue(validateField(schema, next, name)) }));
  };

  const bind = (name: string): FieldBinding => ({
    value: values[name] ?? "",
    error: errors[name],
    onInput: (event) => {
      const next = { ...values, [name]: (event.currentTarget as HTMLInputElement).value };
      setValues(next);
      if (errors[name] !== undefined) check(name, next);
    },
    onBlur: () => {
      if ((values[name] ?? "") !== "") check(name, values);
    },
  });

  /** Returns the parsed data, or focuses the first invalid field and returns undefined. */
  const validate = (): z.output<Schema> | undefined => {
    setFormError(undefined);
    const result = validateAll(schema, values);
    if (result.ok) return result.data;
    setErrors(Object.fromEntries(Object.entries(result.errors).map(([k, v]) => [k, issue(v)])));
    focusField(firstInvalid(Object.keys(initial), result.errors));
    return undefined;
  };

  /** Puts an API error under its field when it has one, above the form otherwise. */
  const showApiError = (error: ApiError, fieldOf: Record<string, string> = {}) => {
    const field = fieldOf[error.code];
    if (field !== undefined) {
      setErrors((current) => ({ ...current, [field]: error }));
      focusField(field);
    } else if (error.fields === undefined) setFormError(error);
    else setErrors({ ...error.fields });
  };

  return { values, setValues, bind, validate, showApiError, formError };
}
