import { z } from "zod";
import { supportedLanguages } from "../i18n/languages.js";

export const topicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  sortOrder: z.number().int(),
});

export const threadAuthorSchema = z.object({
  id: z.uuid().nullable(),
  handle: z.string(),
});

export const threadSummarySchema = z.object({
  id: z.uuid(),
  topicId: z.uuid(),
  title: z.string(),
  language: z.enum(supportedLanguages),
  country: z.string().nullable(),
  stack: z.string().nullable(),
  routeId: z.uuid().nullable(),
  acceptedReplyId: z.uuid().nullable(),
  status: z.enum(["open", "locked", "hidden"]),
  author: threadAuthorSchema,
  repliesCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const replySchema = z.object({
  id: z.uuid(),
  threadId: z.uuid(),
  author: threadAuthorSchema,
  content: z.string(),
  usefulVotes: z.number().int(),
  status: z.enum(["visible", "hidden"]),
  createdAt: z.string(),
});

export const threadDetailSchema = threadSummarySchema.extend({
  content: z.string(),
  replies: z.array(replySchema),
});

export const postSchema = z.object({
  id: z.uuid(),
  author: threadAuthorSchema,
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  language: z.enum(supportedLanguages),
  category: z.string(),
  status: z.enum(["draft", "published"]),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const newsletterSubscriberSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  language: z.string(),
  confirmed: z.boolean(),
  createdAt: z.string(),
});

export type Topic = z.infer<typeof topicSchema>;
export type ThreadAuthor = z.infer<typeof threadAuthorSchema>;
export type ThreadSummary = z.infer<typeof threadSummarySchema>;
export type ThreadDetail = z.infer<typeof threadDetailSchema>;
export type Reply = z.infer<typeof replySchema>;
export type Post = z.infer<typeof postSchema>;
export type NewsletterSubscriber = z.infer<typeof newsletterSubscriberSchema>;
