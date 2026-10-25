import { z } from "zod";
import { codeOr } from "../accounts/fields.js";
import { stackIds } from "../accounts/stacks.js";
import { routeStates } from "./rules.js";

export const titleMinLength = 8;
export const titleMaxLength = 140;
export const contentMaxLength = 50_000;
export const pageSizeDefault = 20;
export const pageSizeMax = 50;

export const serviceSlugSchema = z
  .string({ error: codeOr("service_invalid") })
  .regex(/^[a-z0-9][a-z0-9-]{1,39}$/, { error: "service_invalid" });

export const stackSchema = z.enum(stackIds as [string, ...string[]], {
  error: codeOr("stack_invalid"),
});

export const titleSchema = z
  .string({ error: codeOr("title_invalid") })
  .trim()
  .min(titleMinLength, { error: "title_invalid" })
  .max(titleMaxLength, { error: "title_invalid" });

export const contentSchema = z
  .string({ error: codeOr("content_required") })
  .trim()
  .min(1, { error: "content_required" })
  .max(contentMaxLength, { error: "content_too_long" });

export const idSchema = z.uuid({ error: codeOr("id_invalid") });

export const routeStateSchema = z.enum(routeStates, { error: codeOr("state_invalid") });

export const potholesFilterSchema = z.enum(["open"], { error: codeOr("potholes_invalid") });

export const environmentSchema = z.enum(["test", "production"], {
  error: codeOr("environment_invalid"),
});

export const potholeStatuses = ["open", "confirmed", "resolved"] as const;
export type PotholeStatus = (typeof potholeStatuses)[number];

export const descriptionSchema = z
  .string({ error: codeOr("description_invalid") })
  .trim()
  .min(10, { error: "description_invalid" })
  .max(2000, { error: "description_invalid" });

/** Query strings send empty filters as ""; treat them as absent. */
export function optionalFilter<Schema extends z.ZodType>(schema: Schema) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional(),
  );
}
