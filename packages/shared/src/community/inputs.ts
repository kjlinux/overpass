import { z } from "zod";
import { emailSchema } from "../accounts/fields.js";
import { supportedLanguages } from "../i18n/languages.js";

export const threadCreateInput = z.strictObject({
  topicId: z.uuid(),
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(10).max(10000),
  language: z.enum(supportedLanguages).default("fr"),
  country: z.string().length(2).optional(),
  stack: z.string().trim().max(32).optional(),
  routeId: z.uuid().optional(),
});

export const replyCreateInput = z.strictObject({
  content: z.string().trim().min(3).max(5000),
});

export const postCreateInput = z.strictObject({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(10).max(300),
  content: z.string().trim().min(20).max(20000),
  language: z.enum(supportedLanguages).default("fr"),
  category: z.string().trim().min(2).max(32).default("news"),
});

export const newsletterSubscribeInput = z.strictObject({
  email: emailSchema,
  language: z.enum(supportedLanguages).default("fr"),
});

export type ThreadCreateInput = z.infer<typeof threadCreateInput>;
export type ReplyCreateInput = z.infer<typeof replyCreateInput>;
export type PostCreateInput = z.infer<typeof postCreateInput>;
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeInput>;
