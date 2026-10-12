import { z } from "zod";

export const fieldErrorSchema = z.object({ code: z.string(), message: z.string() });

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fields: z.record(z.string(), fieldErrorSchema).optional(),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Builds the response envelope schema around a data schema. */
export function envelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({ data: data.nullable(), error: apiErrorSchema.nullable() });
}

export type Envelope<T> = { data: T; error: null } | { data: null; error: ApiError };

/** Wraps a successful payload in the response envelope. */
export function ok<T>(data: T): Envelope<T> {
  return { data, error: null };
}

/** Wraps an error in the response envelope. */
export function fail(error: ApiError): Envelope<never> {
  return { data: null, error };
}
