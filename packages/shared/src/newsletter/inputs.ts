import { z } from "zod";
import { codeOr, emailSchema, languageSchema } from "../accounts/fields.js";

/** Batches protect the reputation of the sending domain (section 7 of the specification). */
export const newsletterRules = {
  maxItems: 15,
  itemsPerKind: 3,
  weekDays: 7,
  batchSize: 50,
  confirmHours: 48,
  subjectMaxLength: 140,
  introMaxLength: 5_000,
} as const;

export const issueItemKinds = ["route", "thread", "post"] as const;
export type IssueItemKind = (typeof issueItemKinds)[number];

export const issueStatuses = ["draft", "queued", "sent"] as const;
export type IssueStatus = (typeof issueStatuses)[number];

export const subscribeInput = z.strictObject({ email: emailSchema, language: languageSchema });

export const newsletterTokenInput = z.strictObject({
  token: z
    .string({ error: codeOr("token_invalid") })
    .regex(/^[A-Za-z0-9_.-]{20,200}$/, { error: "token_invalid" }),
});

const subjectSchema = z
  .string({ error: codeOr("subject_invalid") })
  .trim()
  .min(1, { error: "subject_invalid" })
  .max(newsletterRules.subjectMaxLength, { error: "subject_invalid" });

const introSchema = z
  .string({ error: codeOr("intro_too_long") })
  .trim()
  .max(newsletterRules.introMaxLength, { error: "intro_too_long" });

const itemsSchema = z
  .array(
    z.strictObject({
      kind: z.enum(issueItemKinds, { error: "items_invalid" }),
      id: z.uuid({ error: "items_invalid" }),
    }),
    { error: codeOr("items_invalid") },
  )
  .max(newsletterRules.maxItems, { error: "items_invalid" });

export const issueCreateInput = z.strictObject({
  language: languageSchema,
  subject: subjectSchema,
  intro: introSchema,
  items: itemsSchema,
});

export const issueUpdateInput = z
  .strictObject({
    subject: subjectSchema.optional(),
    intro: introSchema.optional(),
    items: itemsSchema.optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    error: "nothing_to_update",
  });

export const issueDraftQuery = z.object({ language: languageSchema.default("fr") });

export type SubscribeInput = z.infer<typeof subscribeInput>;
export type NewsletterTokenInput = z.infer<typeof newsletterTokenInput>;
export type IssueCreateInput = z.infer<typeof issueCreateInput>;
export type IssueUpdateInput = z.infer<typeof issueUpdateInput>;
export type IssueItemRef = IssueCreateInput["items"][number];
