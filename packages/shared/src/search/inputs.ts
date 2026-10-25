import { z } from "zod";
import { codeOr, languageSchema } from "../accounts/fields.js";
import { postCategories } from "../blog/fields.js";
import { topicSlugs } from "../discussions/fields.js";
import { defaultLanguage } from "../i18n/languages.js";
import { optionalFilter } from "../routes/fields.js";

export const searchKinds = ["posts", "threads", "routes"] as const;
export type SearchKind = (typeof searchKinds)[number];

/** A blog category or a discussion topic, checked against the kind by the API. */
const searchCategories = [...postCategories, ...topicSlugs] as const;

export const searchQuery = z.object({
  q: z
    .string({ error: codeOr("query_invalid") })
    .trim()
    .min(2, { error: "query_invalid" })
    .max(100, { error: "query_invalid" }),
  kind: optionalFilter(z.enum(searchKinds, { error: codeOr("kind_invalid") })),
  category: optionalFilter(z.enum(searchCategories, { error: codeOr("category_invalid") })),
  language: optionalFilter(languageSchema),
  lang: languageSchema.default(defaultLanguage),
  cursor: optionalFilter(z.string().max(400, { error: "cursor_invalid" })),
  limit: z.coerce
    .number({ error: "limit_invalid" })
    .int({ error: "limit_invalid" })
    .min(1, { error: "limit_invalid" })
    .max(20, { error: "limit_invalid" })
    .default(5),
});

export type SearchQuery = z.infer<typeof searchQuery>;
