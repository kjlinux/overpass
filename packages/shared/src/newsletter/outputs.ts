import { z } from "zod";
import { supportedLanguages } from "../i18n/languages.js";
import { issueItemKinds, issueStatuses } from "./inputs.js";

export const issueItemSchema = z.object({
  kind: z.enum(issueItemKinds),
  id: z.uuid(),
  title: z.string(),
  summary: z.string(),
  path: z.string(),
});

export const issueDraftSchema = z.object({
  language: z.enum(supportedLanguages),
  subject: z.string(),
  intro: z.string(),
  items: z.array(issueItemSchema),
});

export const issueSchema = issueDraftSchema.extend({
  id: z.uuid(),
  number: z.number().int(),
  status: z.enum(issueStatuses),
  createdAt: z.string(),
  queuedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  recipients: z.number().int(),
  delivered: z.number().int(),
});

export type IssueItem = z.infer<typeof issueItemSchema>;
export type IssueDraft = z.infer<typeof issueDraftSchema>;
export type Issue = z.infer<typeof issueSchema>;
