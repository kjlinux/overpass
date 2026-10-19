import { z } from "zod";

const text = z.object({ title: z.string().min(1), description: z.string().min(1) });

/** Shape of one apps/web/src/share/locales file: site texts, title pattern, page entries. */
export const shareMessagesSchema = z.object({
  site: text.extend({ name: z.string().min(1), promise: z.string().min(1) }),
  titleTemplate: z.string().includes("{{page}}"),
  pages: z.record(z.string(), text),
});

export type ShareMessages = z.infer<typeof shareMessagesSchema>;
export type ShareText = z.infer<typeof text>;

/** A page or content title inside the site pattern, for example "Tarifs · Overpass". */
export function pageTitle(messages: ShareMessages, title: string): string {
  return messages.titleTemplate.replace("{{page}}", title);
}
