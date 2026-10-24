import { postCategories, stackIds, supportedLanguages, topicSlugs } from "@overpass/shared";
import { z } from "zod";

const language = z.enum(supportedLanguages);
const title = z.string().min(8).max(140);
const content = z.string().min(1).max(50000);
const isoDate = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`));

export const routeSeedSchema = z.object({
  service: z.string().regex(/^[a-z0-9-]+$/),
  country: z.string().regex(/^[A-Z]{2}$/),
  stack: z.enum(stackIds as [string, ...string[]]),
  language,
  title,
  content,
});

export const threadSeedSchema = z.object({
  topic: z.enum(topicSlugs),
  language,
  title,
  content: content.max(20000),
});

export const postSeedSchema = z.object({
  kind: z.enum(["news", "member"]),
  category: z.enum(postCategories),
  language,
  /** Translations of one article share a group key, so they get one translation group. */
  group: z.string().regex(/^[a-z0-9-]+$/),
  title,
  summary: z.string().min(1).max(300),
  publishedAt: isoDate,
  /** A file under posts/covers/, shared by the translations of one article. */
  cover: z
    .string()
    .regex(/^covers\/[a-z0-9-]+\.(png|jpg|webp)$/)
    .optional(),
  content,
});

export type RouteSeed = z.infer<typeof routeSeedSchema>;
export type ThreadSeed = z.infer<typeof threadSeedSchema>;
export type PostSeed = z.infer<typeof postSeedSchema>;
