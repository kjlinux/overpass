import { z } from "zod";

/** Public figures of the home page; every number is counted, never typed. */
export const statsSchema = z.object({
  routes: z.number().int(),
  checks: z.number().int(),
  countries: z.array(z.string()),
  updatedAt: z.string(),
});

export type Stats = z.infer<typeof statsSchema>;
