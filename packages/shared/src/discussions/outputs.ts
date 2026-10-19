import { z } from "zod";
import { supportedLanguages } from "../i18n/languages.js";
import { threadStates, topicSlugs } from "./fields.js";
import { contentStatuses } from "./rules.js";

export const discussionTopicSchema = z.object({
  slug: z.enum(topicSlugs),
  name: z.string(),
  description: z.string(),
  threads: z.number().int(),
});

export const threadSummarySchema = z.object({
  id: z.uuid(),
  topic: z.enum(topicSlugs),
  title: z.string(),
  author: z.string(),
  language: z.enum(supportedLanguages),
  country: z.string().nullable(),
  stack: z.string().nullable(),
  route: z.object({ id: z.uuid(), title: z.string() }).nullable(),
  service: z.object({ slug: z.string(), name: z.string() }).nullable(),
  state: z.enum(threadStates),
  status: z.enum(contentStatuses),
  replies: z.number().int(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
});

/** Content is null when the reader may not see hidden or removed text. */
export const replySchema = z.object({
  id: z.uuid(),
  author: z.string(),
  content: z.string().nullable(),
  status: z.enum(contentStatuses),
  useful: z.number().int(),
  accepted: z.boolean(),
  createdAt: z.string(),
  viewer: z.object({ isAuthor: z.boolean(), voted: z.boolean(), reported: z.boolean() }),
});

export const threadDetailSchema = threadSummarySchema.extend({
  content: z.string().nullable(),
  errorText: z.string().nullable(),
  codeText: z.string().nullable(),
  acceptedReplyId: z.uuid().nullable(),
  transformedRoute: z.uuid().nullable(),
  items: z.array(replySchema),
  viewer: z.object({
    isAuthor: z.boolean(),
    isAdmin: z.boolean(),
    reported: z.boolean(),
    canTransform: z.boolean(),
  }),
});

export const threadPageSchema = z.object({
  items: z.array(threadSummarySchema),
  nextCursor: z.string().nullable(),
});

export type DiscussionTopic = z.infer<typeof discussionTopicSchema>;
export type ThreadSummary = z.infer<typeof threadSummarySchema>;
export type Reply = z.infer<typeof replySchema>;
export type ThreadDetail = z.infer<typeof threadDetailSchema>;
export type ThreadPage = z.infer<typeof threadPageSchema>;
