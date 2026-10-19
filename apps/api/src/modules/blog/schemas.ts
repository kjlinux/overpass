import { languageSchema } from "@overpass/shared";
import { z } from "zod";

export {
  blogModerationInput,
  blogModerationParams,
  blogSuspensionInput,
  commentCreateInput,
  feedQuery,
  postCreateInput,
  postListQuery,
  postUpdateInput,
} from "@overpass/shared";

export const idParams = z.object({ id: z.uuid({ error: "id_invalid" }) });

export const handleParams = z.object({
  handle: z.string().regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, { error: "handle_invalid" }),
});

export const slugParams = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,89}$/, { error: "slug_invalid" }),
});

export const readQuery = z.object({ lang: languageSchema.optional() });

export const commentsQuery = z.object({
  cursor: z.string().max(400, { error: "cursor_invalid" }).optional(),
});
