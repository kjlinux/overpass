import { z } from "zod";
import { supportedLanguages } from "../i18n/languages.js";

export const roleSchema = z.enum(["member", "admin"]);

export const meSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  handle: z.string(),
  country: z.string(),
  language: z.enum(supportedLanguages),
  role: roleSchema,
  stacks: z.array(z.string()),
  newsletter: z.boolean(),
  createdAt: z.string(),
});

export const contributionsSchema = z.object({
  routes: z.number().int(),
  checks: z.number().int(),
  potholes: z.number().int(),
});

export const publicProfileSchema = z.object({
  handle: z.string(),
  country: z.string(),
  stacks: z.array(z.string()),
  contributions: contributionsSchema,
  points: z.number().int(),
  memberSince: z.string(),
});

export const tokenSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  usage: z.enum(["mcp", "api"]),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string(),
});

/** The only response that ever carries the clear token. */
export const createdTokenSchema = tokenSummarySchema.extend({ token: z.string() });

export type Role = z.infer<typeof roleSchema>;
export type Me = z.infer<typeof meSchema>;
export type Contributions = z.infer<typeof contributionsSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type TokenSummary = z.infer<typeof tokenSummarySchema>;
export type CreatedToken = z.infer<typeof createdTokenSchema>;
