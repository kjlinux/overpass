import { z } from "zod";
import { supportedLanguages } from "../i18n/languages.js";
import { africanCountries } from "./countries.js";
import { stackIds } from "./stacks.js";

export const passwordMinLength = 10;
export const passwordMaxLength = 128;

/** Reports a missing value as "required" and anything else as the given code. */
export function codeOr(code: string) {
  return (issue: { input?: unknown }) => (issue.input === undefined ? "required" : code);
}

export const emailSchema = z
  .string({ error: codeOr("email_invalid") })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "email_invalid" }).max(254, { error: "email_invalid" }));

export const newPasswordSchema = z
  .string({ error: codeOr("password_too_short") })
  .min(passwordMinLength, { error: "password_too_short" })
  .max(passwordMaxLength, { error: "password_too_long" });

/** Any stored password, bounded so a huge body cannot keep Argon2 busy. */
export const currentPasswordSchema = z
  .string({ error: codeOr("password_required") })
  .min(1, { error: "password_required" })
  .max(1024, { error: "password_too_long" });

export const countrySchema = z.enum(africanCountries, { error: codeOr("country_invalid") });

export const stacksSchema = z
  .array(z.enum(stackIds as [string, ...string[]], { error: "stacks_invalid" }), {
    error: "stacks_invalid",
  })
  .max(stackIds.length, { error: "stacks_invalid" })
  .transform((stacks) => [...new Set(stacks)]);

export const languageSchema = z.enum(supportedLanguages, { error: codeOr("language_invalid") });

/** Names that would let a member pass for the team; dev- belongs to generated handles. */
const reservedHandles = new Set([
  "admin",
  "administrator",
  "moderator",
  "overpass",
  "staff",
  "support",
  "team",
  "api",
  "root",
  "system",
]);

export const handleSchema = z
  .string({ error: codeOr("handle_invalid") })
  .regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, { error: "handle_invalid" })
  .refine((handle) => !reservedHandles.has(handle) && !handle.startsWith("dev-"), {
    error: "handle_reserved",
  });

export const tokenUsageSchema = z.enum(["mcp", "api"], { error: codeOr("usage_invalid") });

export const tokenNameSchema = z
  .string({ error: codeOr("token_name_invalid") })
  .trim()
  .min(1, { error: "token_name_invalid" })
  .max(60, { error: "token_name_invalid" });

/** Maps a validation error to one stable code per top-level field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.code === "unrecognized_keys" ? "_form" : String(issue.path[0] ?? "_form");
    const code = issue.code === "unrecognized_keys" ? "unknown_field" : issue.message;
    fields[field] ??= code;
  }
  return fields;
}
