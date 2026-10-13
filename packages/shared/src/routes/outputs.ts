import { z } from "zod";
import { supportedLanguages } from "../i18n/languages.js";
import { potholeStatuses } from "./fields.js";
import { routeStates } from "./rules.js";

export const serviceCategories = ["payment", "sms", "ussd"] as const;

/** How a covered country was confirmed: a dated source, or a clear road on the platform. */
export const coverageSchema = z.object({
  country: z.string(),
  basis: z.enum(["source", "community"]),
  source: z.string().nullable(),
  consultedOn: z.string().nullable(),
  routeId: z.uuid().nullable(),
  confirmedAt: z.string().nullable(),
});

export const serviceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.enum(serviceCategories),
  countries: z.array(z.string()),
  coverage: z.array(coverageSchema),
  simulated: z.boolean(),
});

export const routeSummarySchema = z.object({
  id: z.uuid(),
  service: z.object({ slug: z.string(), name: z.string(), simulated: z.boolean() }),
  country: z.string(),
  stack: z.string(),
  language: z.enum(supportedLanguages),
  title: z.string(),
  author: z.string(),
  version: z.number().int(),
  state: z.enum(routeStates),
  recentCheckers: z.number().int(),
  unresolvedPotholes: z.number().int(),
  lastCheckAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const checkSchema = z.object({
  id: z.uuid(),
  handle: z.string(),
  country: z.string(),
  environment: z.enum(["test", "production"]),
  checkedAt: z.string(),
});

export const potholeSchema = z.object({
  id: z.uuid(),
  handle: z.string(),
  description: z.string(),
  status: z.enum(potholeStatuses),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const viewerSchema = z.object({
  isAuthor: z.boolean(),
  eligibility: z.enum(["allowed", "own_route", "too_soon", "anonymous"]),
  nextCheckAt: z.string().nullable(),
});

export const routeDetailSchema = routeSummarySchema.extend({
  content: z.string(),
  fallback: z.boolean(),
  translations: z.array(z.object({ id: z.uuid(), language: z.enum(supportedLanguages) })),
  checks: z.array(checkSchema),
  potholes: z.array(potholeSchema),
  viewer: viewerSchema,
});

export const routePageSchema = z.object({
  items: z.array(routeSummarySchema),
  nextCursor: z.string().nullable(),
});

export const myCheckSchema = checkSchema.omit({ handle: true }).extend({
  route: z.object({ id: z.uuid(), title: z.string() }),
});

export type Coverage = z.infer<typeof coverageSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type RouteSummary = z.infer<typeof routeSummarySchema>;
export type RouteCheck = z.infer<typeof checkSchema>;
export type Pothole = z.infer<typeof potholeSchema>;
export type RouteViewer = z.infer<typeof viewerSchema>;
export type RouteDetail = z.infer<typeof routeDetailSchema>;
export type RoutePage = z.infer<typeof routePageSchema>;
export type MyCheck = z.infer<typeof myCheckSchema>;
