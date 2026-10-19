import { z } from "zod";
import { codeOr } from "../accounts/fields.js";

/** Limits of the blog; reports and the recent window come from section 4 of the specification. */
export const blogRules = {
  hideAfterReports: 2,
  recentDays: 30,
  relatedCount: 3,
  slugMaxLength: 80,
  summaryMaxLength: 300,
  commentMaxLength: 5_000,
} as const;

export const postKinds = ["news", "member"] as const;
export type PostKind = (typeof postKinds)[number];

export const postCategories = ["tech-news", "tutorials", "portraits"] as const;
export type PostCategory = (typeof postCategories)[number];

export const postStatuses = ["draft", "published"] as const;
export type PostStatus = (typeof postStatuses)[number];

export const moderationStatuses = ["visible", "hidden", "blocked"] as const;
export type ModerationStatus = (typeof moderationStatuses)[number];

export const moderationActions = ["hide", "block", "restore"] as const;
export type ModerationAction = (typeof moderationActions)[number];

export const postFeeds = ["recent", "forme", "news"] as const;
export type PostFeed = (typeof postFeeds)[number];

export const postKindSchema = z.enum(postKinds, { error: codeOr("kind_invalid") });

export const postCategorySchema = z.enum(postCategories, {
  error: codeOr("post_category_invalid"),
});

export const postStatusSchema = z.enum(postStatuses, { error: codeOr("post_status_invalid") });

export const summarySchema = z
  .string({ error: codeOr("summary_invalid") })
  .trim()
  .min(1, { error: "summary_invalid" })
  .max(blogRules.summaryMaxLength, { error: "summary_invalid" });

export const commentSchema = z
  .string({ error: codeOr("body_required") })
  .trim()
  .min(1, { error: "body_required" })
  .max(blogRules.commentMaxLength, { error: "comment_too_long" });

export const publishAtSchema = z.iso
  .datetime({ offset: true, error: codeOr("publish_at_invalid") })
  .transform((value) => new Date(value));
