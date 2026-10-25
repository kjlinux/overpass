import {
  handleSchema,
  postCategories,
  stackIds,
  supportedLanguages,
  topicSlugs,
} from "@overpass/shared";
import { z } from "zod";

const language = z.enum(supportedLanguages);
const title = z.string().min(8).max(140);
const content = z.string().min(1).max(50000);
/** A UTC day, or a UTC day and minute; seeds never need seconds. */
const when = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/)
  .transform((value) => new Date(value.length === 10 ? `${value}T00:00:00.000Z` : `${value}Z`));
const handle = handleSchema;
const handles = z
  .string()
  .transform((value) => value.split(",").map((part) => part.trim()))
  .pipe(z.array(handle));
const stack = z.enum(stackIds as [string, ...string[]]);
const country = z.string().regex(/^[A-Z]{2}$/);

export const memberSeedSchema = z.object({
  handle,
  country,
  language,
  stacks: z
    .string()
    .transform((value) => value.split(",").map((part) => part.trim()))
    .pipe(z.array(stack)),
  joinedAt: when,
  /** How many verifications the member has made since joining. */
  checks: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional()
    .transform((value) => (value === undefined ? 0 : Number(value))),
});

const replySchema = z.strictObject({
  author: handle,
  at: when,
  useful: handles.default([]),
  accepted: z
    .literal("true")
    .optional()
    .transform((flag) => flag !== undefined),
  content: content.max(20000),
});

const commentSchema = z.strictObject({
  author: handle,
  at: when,
  likes: handles.default([]),
  content: content.max(5000),
});

export const routeSeedSchema = z.object({
  service: z.string().regex(/^[a-z0-9-]+$/),
  country,
  stack,
  language,
  title,
  content,
});

/** Without an author the thread is the team's; replies come in the order they were written. */
export const threadSeedSchema = z.object({
  topic: z.enum(topicSlugs),
  language,
  title,
  author: handle.optional(),
  at: when.optional(),
  country: country.optional(),
  stack: stack.optional(),
  content: content.max(20000),
  replies: z
    .array(replySchema)
    .default([])
    .refine((replies) => replies.filter((reply) => reply.accepted).length <= 1, {
      error: "one accepted reply at most",
    }),
});

export const postSeedSchema = z
  .object({
    kind: z.enum(["news", "member"]),
    author: handle.optional(),
    stars: handles.default([]),
    comments: z.array(commentSchema).default([]),
    category: z.enum(postCategories),
    language,
    /** Translations of one article share a group key, so they get one translation group. */
    group: z.string().regex(/^[a-z0-9-]+$/),
    title,
    summary: z.string().min(1).max(300),
    publishedAt: when,
    /** A file under posts/covers/, shared by the translations of one article. */
    cover: z
      .string()
      .regex(/^covers\/[a-z0-9-]+\.(png|jpg|webp)$/)
      .optional(),
    content,
  })
  .refine((post) => (post.kind === "member") === (post.author !== undefined), {
    error: "a member post names its author, a news post does not",
    path: ["author"],
  });

export type MemberSeed = z.infer<typeof memberSeedSchema>;
export type RouteSeed = z.infer<typeof routeSeedSchema>;
export type ThreadSeed = z.infer<typeof threadSeedSchema>;
export type PostSeed = z.infer<typeof postSeedSchema>;
