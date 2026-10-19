import { supportedLanguages } from "@overpass/shared";
import { z } from "zod";

/** Path of an itinerary page; an id that is not a UUID simply finds nothing. */
export const routePageParams = z.object({
  lang: z.enum(supportedLanguages),
  id: z.string().max(100),
});

/** Path of a blog page; a segment may be a slug, a member blog (@handle) or a static page. */
export const postPageParams = z.object({
  lang: z.enum(supportedLanguages),
  slug: z.string().max(200),
});

export const isUuid = (value: string): boolean => z.uuid().safeParse(value).success;
