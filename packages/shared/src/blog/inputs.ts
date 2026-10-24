import { z } from "zod";
import { codeOr, languageSchema } from "../accounts/fields.js";
import {
  idSchema,
  optionalFilter,
  pageSizeDefault,
  pageSizeMax,
  titleSchema,
  contentSchema,
} from "../routes/fields.js";
import {
  commentSchema,
  moderationActions,
  postCategorySchema,
  postFeeds,
  postKindSchema,
  postStatusSchema,
  publishAtSchema,
  summarySchema,
} from "./fields.js";

export const postCreateInput = z.strictObject({
  kind: postKindSchema.default("member"),
  language: languageSchema,
  category: postCategorySchema,
  title: titleSchema,
  summary: summarySchema,
  content: contentSchema,
  status: postStatusSchema.default("draft"),
  publishAt: publishAtSchema.optional(),
  translationOf: idSchema.optional(),
  coverMediaId: idSchema.nullable().optional(),
});

export const postUpdateInput = z
  .strictObject({
    category: postCategorySchema.optional(),
    title: titleSchema.optional(),
    summary: summarySchema.optional(),
    content: contentSchema.optional(),
    status: postStatusSchema.optional(),
    publishAt: publishAtSchema.nullable().optional(),
    coverMediaId: idSchema.nullable().optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    error: "nothing_to_update",
  });

/** Generated handles start with dev-, so the filter only checks the shape. */
const authorFilter = z
  .string({ error: "handle_invalid" })
  .regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, { error: "handle_invalid" });

export const postListQuery = z.object({
  feed: z.enum(postFeeds, { error: "feed_invalid" }).default("recent"),
  category: optionalFilter(postCategorySchema),
  author: optionalFilter(authorFilter),
  language: optionalFilter(languageSchema),
  cursor: optionalFilter(z.string().max(400, { error: "cursor_invalid" })),
  limit: z.coerce
    .number({ error: "limit_invalid" })
    .int({ error: "limit_invalid" })
    .min(1, { error: "limit_invalid" })
    .max(pageSizeMax, { error: "limit_invalid" })
    .default(pageSizeDefault),
});

export const commentCreateInput = z.strictObject({ content: commentSchema });

export const blogModerationInput = z.strictObject({
  action: z.enum(moderationActions, { error: codeOr("action_invalid") }),
});

export const blogModerationParams = z.object({
  kind: z.enum(["post", "comment"], { error: "kind_invalid" }),
  id: idSchema,
});

export const blogSuspensionInput = z.strictObject({
  suspended: z.boolean({ error: codeOr("suspended_invalid") }),
});

export const feedQuery = z.object({ lang: languageSchema.default("fr") });

export type PostCreateInput = z.infer<typeof postCreateInput>;
export type PostUpdateInput = z.infer<typeof postUpdateInput>;
export type PostListQuery = z.infer<typeof postListQuery>;
export type CommentCreateInput = z.infer<typeof commentCreateInput>;
export type BlogModerationInput = z.infer<typeof blogModerationInput>;
export type BlogContentKind = z.infer<typeof blogModerationParams>["kind"];
