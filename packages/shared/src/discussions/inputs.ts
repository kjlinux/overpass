import { z } from "zod";
import { codeOr, countrySchema, languageSchema } from "../accounts/fields.js";
import {
  idSchema,
  optionalFilter,
  pageSizeDefault,
  pageSizeMax,
  stackSchema,
  titleSchema,
} from "../routes/fields.js";
import {
  bodySchema,
  codeTextSchema,
  errorTextSchema,
  threadStates,
  topicSchema,
} from "./fields.js";
import { moderationDecisions } from "./rules.js";

export const threadCreateInput = z.strictObject({
  topic: topicSchema,
  title: titleSchema,
  content: bodySchema,
  language: languageSchema,
  country: countrySchema.optional(),
  stack: stackSchema.optional(),
  route: idSchema.optional(),
  errorText: errorTextSchema.optional(),
  codeText: codeTextSchema.optional(),
});

export const threadListQuery = z.object({
  topic: optionalFilter(topicSchema),
  country: optionalFilter(countrySchema),
  stack: optionalFilter(stackSchema),
  language: optionalFilter(languageSchema),
  route: optionalFilter(idSchema),
  state: optionalFilter(z.enum(threadStates, { error: codeOr("state_invalid") })),
  cursor: optionalFilter(z.string().max(400, { error: "cursor_invalid" })),
  limit: z.coerce
    .number({ error: "limit_invalid" })
    .int({ error: "limit_invalid" })
    .min(1, { error: "limit_invalid" })
    .max(pageSizeMax, { error: "limit_invalid" })
    .default(pageSizeDefault),
});

export const replyCreateInput = z.strictObject({ content: bodySchema });

export const acceptInput = z.strictObject({ reply: idSchema });

export const moderationDecisionInput = z.strictObject({
  decision: z.enum(moderationDecisions, { error: codeOr("decision_invalid") }),
});

export const moderationParams = z.object({
  kind: z.enum(["thread", "reply"], { error: "kind_invalid" }),
  id: idSchema,
});

export type ThreadCreateInput = z.infer<typeof threadCreateInput>;
export type ThreadListQuery = z.infer<typeof threadListQuery>;
export type ReplyCreateInput = z.infer<typeof replyCreateInput>;
export type AcceptInput = z.infer<typeof acceptInput>;
export type ModerationDecisionInput = z.infer<typeof moderationDecisionInput>;
export type ContentKind = z.infer<typeof moderationParams>["kind"];
