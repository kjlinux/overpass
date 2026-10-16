import { z } from "zod";
import { codeOr } from "../accounts/fields.js";

/** The six themes of the launch, in their display order. */
export const topicSlugs = [
  "integrations",
  "cloud",
  "tools-ai",
  "career",
  "projects",
  "events",
] as const;
export type TopicSlug = (typeof topicSlugs)[number];

/** A question asked from a route always lands in this theme. */
export const integrationsTopic: TopicSlug = "integrations";

export const threadStates = ["open", "resolved"] as const;
export type ThreadState = (typeof threadStates)[number];

export const discussionLimits = { body: 20_000, errorText: 4_000, codeText: 20_000 } as const;

export const topicSchema = z.enum(topicSlugs, { error: codeOr("topic_invalid") });

export const bodySchema = z
  .string({ error: codeOr("body_required") })
  .trim()
  .min(1, { error: "body_required" })
  .max(discussionLimits.body, { error: "body_too_long" });

export const errorTextSchema = z
  .string({ error: codeOr("error_text_too_long") })
  .trim()
  .max(discussionLimits.errorText, { error: "error_text_too_long" });

export const codeTextSchema = z
  .string({ error: codeOr("code_text_too_long") })
  .max(discussionLimits.codeText, { error: "code_text_too_long" });
