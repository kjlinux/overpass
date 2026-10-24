import { z } from "zod";

/** Two megabytes: a screenshot fits, a raw camera photo does not. */
export const mediaMaxBytes = 2 * 1024 * 1024;

export const acceptedTypes = ["image/png", "image/jpeg", "image/webp"] as const;

export const mediaParams = z.object({ id: z.uuid({ error: "id_invalid" }) });
