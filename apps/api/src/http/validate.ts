import { fieldErrors } from "@overpass/shared";
import type { z } from "zod";
import { AppError } from "./app-error.js";

/** Parses untrusted input or throws a 400 carrying one code per invalid field. */
export function parseInput<Schema extends z.ZodType>(schema: Schema, value: unknown): z.output<Schema> {
  const result = schema.safeParse(value ?? {});
  if (!result.success) throw new AppError("validation_failed", 400, fieldErrors(result.error));
  return result.data;
}
