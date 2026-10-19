import { z } from "zod";
import { codeOr } from "../accounts/fields.js";
import { optionalFilter } from "../routes/fields.js";
import { queueKinds, queueStates, routeDecisions } from "./fields.js";

const reasonOf = (code: string) =>
  z
    .string({ error: codeOr(code) })
    .trim()
    .min(3, { error: code })
    .max(500, { error: code });

const cursorSchema = optionalFilter(z.string().max(400, { error: "cursor_invalid" }));

export const routeReportInput = z.strictObject({ reason: reasonOf("report_reason_invalid") });

export const routeModerationInput = z.strictObject({
  decision: z.enum(routeDecisions, { error: codeOr("decision_invalid") }),
  reason: z.string().trim().max(500, { error: "reason_invalid" }).optional(),
});

export const suspensionInput = z.strictObject({ reason: reasonOf("suspension_reason_invalid") });

export const adminQueueQuery = z.object({
  kind: optionalFilter(z.enum(queueKinds, { error: "kind_invalid" })).transform(
    (kind) => kind ?? "route",
  ),
  state: optionalFilter(z.enum(queueStates, { error: "state_invalid" })).transform(
    (state) => state ?? "open",
  ),
  cursor: cursorSchema,
});

export const adminAccountsQuery = z.object({
  q: optionalFilter(z.string().trim().toLowerCase().max(254, { error: "query_invalid" })),
  cursor: cursorSchema,
});

export const adminLogQuery = z.object({ cursor: cursorSchema });

export type RouteReportInput = z.infer<typeof routeReportInput>;
export type RouteModerationInput = z.infer<typeof routeModerationInput>;
export type SuspensionInput = z.infer<typeof suspensionInput>;
export type AdminQueueQuery = z.infer<typeof adminQueueQuery>;
export type AdminAccountsQuery = z.infer<typeof adminAccountsQuery>;
export type AdminLogQuery = z.infer<typeof adminLogQuery>;
