import { z } from "zod";
import { codeOr, countrySchema, languageSchema } from "../accounts/fields.js";
import {
  contentSchema,
  descriptionSchema,
  environmentSchema,
  idSchema,
  optionalFilter,
  pageSizeDefault,
  pageSizeMax,
  potholesFilterSchema,
  routeStateSchema,
  serviceSlugSchema,
  stackSchema,
  titleSchema,
} from "./fields.js";

export const routeCreateInput = z.strictObject({
  service: serviceSlugSchema,
  country: countrySchema,
  stack: stackSchema,
  language: languageSchema,
  title: titleSchema,
  content: contentSchema.optional(),
  translationOf: idSchema.optional(),
  sourceThread: idSchema.optional(),
});

export const routeUpdateInput = z
  .strictObject({
    service: serviceSlugSchema.optional(),
    country: countrySchema.optional(),
    stack: stackSchema.optional(),
    title: titleSchema.optional(),
    content: contentSchema.optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    error: "nothing_to_update",
  });

export const routeListQuery = z.object({
  q: optionalFilter(z.string().trim().max(200, { error: "query_invalid" })),
  service: optionalFilter(serviceSlugSchema),
  country: optionalFilter(countrySchema),
  stack: optionalFilter(stackSchema),
  language: optionalFilter(languageSchema),
  state: optionalFilter(routeStateSchema),
  potholes: optionalFilter(potholesFilterSchema),
  cursor: optionalFilter(z.string().max(400, { error: "cursor_invalid" })),
  limit: z.coerce
    .number({ error: "limit_invalid" })
    .int({ error: "limit_invalid" })
    .min(1, { error: "limit_invalid" })
    .max(pageSizeMax, { error: "limit_invalid" })
    .default(pageSizeDefault),
});

export const routeReadQuery = z.object({ lang: optionalFilter(languageSchema) });

export const checkCreateInput = z.strictObject({
  country: countrySchema,
  environment: environmentSchema,
});

export const potholeCreateInput = z.strictObject({ description: descriptionSchema });

export const potholeUpdateInput = z.strictObject({
  status: z.enum(["confirmed", "resolved"], { error: codeOr("status_invalid") }),
});

export type RouteCreateInput = z.infer<typeof routeCreateInput>;
export type RouteUpdateInput = z.infer<typeof routeUpdateInput>;
export type RouteListQuery = z.infer<typeof routeListQuery>;
export type RouteReadQuery = z.infer<typeof routeReadQuery>;
export type CheckCreateInput = z.infer<typeof checkCreateInput>;
export type PotholeCreateInput = z.infer<typeof potholeCreateInput>;
export type PotholeUpdateInput = z.infer<typeof potholeUpdateInput>;
