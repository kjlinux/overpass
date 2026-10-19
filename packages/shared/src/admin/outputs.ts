import { z } from "zod";
import { roleSchema } from "../accounts/outputs.js";
import { logActions, logTargetKinds, queueKinds, routeModerations } from "./fields.js";

/** `path` is the page of the content under the language prefix, for example /routes/:id. */
export const queueItemSchema = z.object({
  kind: z.enum(queueKinds),
  id: z.uuid(),
  title: z.string(),
  excerpt: z.string(),
  author: z.string(),
  reports: z.number().int(),
  lastReportAt: z.string().nullable(),
  status: z.enum(routeModerations),
  path: z.string(),
});

export const adminAccountSchema = z.object({
  id: z.uuid(),
  handle: z.string(),
  email: z.string(),
  country: z.string(),
  role: roleSchema,
  createdAt: z.string(),
  suspendedAt: z.string().nullable(),
});

export const logEntrySchema = z.object({
  id: z.uuid(),
  actor: z.string().nullable(),
  targetKind: z.enum(logTargetKinds),
  targetId: z.uuid(),
  action: z.enum(logActions),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

const pageOf = <Item extends z.ZodType>(item: Item) =>
  z.object({ items: z.array(item), next: z.string().nullable() });

export const queuePageSchema = pageOf(queueItemSchema);
export const adminAccountPageSchema = pageOf(adminAccountSchema);
export const logPageSchema = pageOf(logEntrySchema);

export const routeModerationResultSchema = z.object({ moderation: z.enum(routeModerations) });

export type QueueItem = z.infer<typeof queueItemSchema>;
export type AdminAccount = z.infer<typeof adminAccountSchema>;
export type LogEntry = z.infer<typeof logEntrySchema>;
export type QueuePage = z.infer<typeof queuePageSchema>;
export type AdminAccountPage = z.infer<typeof adminAccountPageSchema>;
export type LogPage = z.infer<typeof logPageSchema>;
export type RouteModerationResult = z.infer<typeof routeModerationResultSchema>;
