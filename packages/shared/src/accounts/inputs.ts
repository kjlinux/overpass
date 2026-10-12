import { z } from "zod";
import {
  countrySchema,
  currentPasswordSchema,
  emailSchema,
  handleSchema,
  languageSchema,
  newPasswordSchema,
  stacksSchema,
  tokenNameSchema,
  tokenUsageSchema,
} from "./fields.js";

export const registerInput = z.strictObject({
  email: emailSchema,
  password: newPasswordSchema,
  country: countrySchema,
});

export const loginInput = z.strictObject({
  email: emailSchema,
  password: currentPasswordSchema,
});

export const forgotInput = z.strictObject({ email: emailSchema });

export const resetInput = z.strictObject({
  token: z.string({ error: "reset_invalid" }).min(1).max(2048, { error: "reset_invalid" }),
  password: newPasswordSchema,
});

export const profileUpdateInput = z.strictObject({
  country: countrySchema.optional(),
  stacks: stacksSchema.optional(),
  language: languageSchema.optional(),
  handle: handleSchema.optional(),
  newsletter: z.boolean({ error: "newsletter_invalid" }).optional(),
});

export const passwordChangeInput = z.strictObject({
  currentPassword: currentPasswordSchema,
  newPassword: newPasswordSchema,
});

export const accountDeleteInput = z.strictObject({ password: currentPasswordSchema });

export const tokenCreateInput = z.strictObject({
  name: tokenNameSchema,
  usage: tokenUsageSchema,
});

export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
export type ForgotInput = z.infer<typeof forgotInput>;
export type ResetInput = z.infer<typeof resetInput>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateInput>;
export type PasswordChangeInput = z.infer<typeof passwordChangeInput>;
export type AccountDeleteInput = z.infer<typeof accountDeleteInput>;
export type TokenCreateInput = z.infer<typeof tokenCreateInput>;
