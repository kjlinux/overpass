import { z } from "zod";
import { supportedLanguages } from "../i18n/languages.js";
import { moderationStatuses, postCategories, postKinds, postStatuses } from "./fields.js";

export const postAuthorSchema = z.object({ handle: z.string(), country: z.string() });

export const postSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  kind: z.enum(postKinds),
  language: z.enum(supportedLanguages),
  category: z.enum(postCategories),
  title: z.string(),
  summary: z.string(),
  author: postAuthorSchema.nullable(),
  status: z.enum(postStatuses),
  moderation: z.enum(moderationStatuses),
  publishedAt: z.string().nullable(),
  stars: z.number().int(),
  comments: z.number().int(),
  translation: z.object({ language: z.enum(supportedLanguages), slug: z.string() }).nullable(),
});

export const postDetailSchema = postSummarySchema.extend({
  content: z.string(),
  related: z.array(postSummarySchema),
  viewer: z.object({
    isAuthor: z.boolean(),
    isAdmin: z.boolean(),
    starred: z.boolean(),
    reported: z.boolean(),
    followsAuthor: z.boolean(),
  }),
});

export const postPageSchema = z.object({
  items: z.array(postSummarySchema),
  nextCursor: z.string().nullable(),
});

/** Content is null when the reader may not see a hidden or blocked comment. */
export const postCommentSchema = z.object({
  id: z.uuid(),
  author: z.string().nullable(),
  content: z.string().nullable(),
  moderation: z.enum(moderationStatuses),
  createdAt: z.string(),
  viewer: z.object({ isAuthor: z.boolean(), reported: z.boolean() }),
});

export const commentPageSchema = z.object({
  items: z.array(postCommentSchema),
  nextCursor: z.string().nullable(),
});

export const blogSchema = z.object({
  handle: z.string(),
  suspended: z.boolean(),
  followers: z.number().int(),
  viewer: z.object({ isOwner: z.boolean(), follows: z.boolean() }),
});

export const followSchema = z.object({
  handle: z.string(),
  country: z.string(),
  followedAt: z.string(),
});

export type PostAuthor = z.infer<typeof postAuthorSchema>;
export type PostSummary = z.infer<typeof postSummarySchema>;
export type PostDetail = z.infer<typeof postDetailSchema>;
export type PostPage = z.infer<typeof postPageSchema>;
export type PostComment = z.infer<typeof postCommentSchema>;
export type CommentPage = z.infer<typeof commentPageSchema>;
export type Blog = z.infer<typeof blogSchema>;
export type Follow = z.infer<typeof followSchema>;
