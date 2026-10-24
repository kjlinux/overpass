import { postCategorySchema, postCreateInput, postKindSchema } from "@overpass/shared";
import { z } from "zod";

/** The form validates what the member types; the date is converted when saving. */
export const postFormSchema = postCreateInput
  .pick({ language: true, title: true, summary: true, content: true })
  .extend({
    category: postCategorySchema,
    kind: postKindSchema,
    cover: z.string().optional(),
    publishAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: "publish_at_invalid" })
      .optional(),
  });

export type PostFormValues = z.output<typeof postFormSchema>;

export const emptyPost: Record<keyof PostFormValues, string> = {
  language: "fr",
  kind: "member",
  category: "tutorials",
  title: "",
  summary: "",
  content: "",
  cover: "",
  publishAt: "",
};

/** A datetime-local value is the reader's local time; the API wants an instant. */
export const toInstant = (local: string | undefined): string | undefined =>
  local === undefined || local === "" ? undefined : new Date(local).toISOString();

export function toLocalInput(iso: string | null): string {
  if (iso === null) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
