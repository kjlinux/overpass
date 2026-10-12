import { fieldErrors } from "@overpass/shared";
import type { z } from "zod";

export type FormValues = Record<string, unknown>;
export type FormErrors = Record<string, string | undefined>;

export type Validation<T> = { ok: true; data: T } | { ok: false; errors: FormErrors };

/** An empty text field or select is "not given", so it reports "required". */
function withoutBlanks(values: FormValues): FormValues {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
}

export function validateAll<Schema extends z.ZodType>(
  schema: Schema,
  values: FormValues,
): Validation<z.output<Schema>> {
  const result = schema.safeParse(withoutBlanks(values));
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, errors: fieldErrors(result.error) };
}

export function validateField(schema: z.ZodType, values: FormValues, name: string) {
  const result = validateAll(schema, values);
  return result.ok ? undefined : result.errors[name];
}

/** The first field in form order that has an error, to move the focus there. */
export function firstInvalid(order: string[], errors: FormErrors): string | undefined {
  return order.find((name) => errors[name] !== undefined);
}
