import { discussionLimits, redactSecrets, titleMaxLength } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";

const limits = {
  title: { max: titleMaxLength, code: "title_invalid" },
  content: { max: discussionLimits.body, code: "body_too_long" },
  errorText: { max: discussionLimits.errorText, code: "error_text_too_long" },
  codeText: { max: discussionLimits.codeText, code: "code_text_too_long" },
} as const;

export type MaskedField = keyof typeof limits;

/** The mask can be longer than a short secret, so the limit is checked on the stored text. */
export function maskWithin(field: MaskedField, text: string): string {
  const masked = redactSecrets(text).text;
  const { max, code } = limits[field];
  if (masked.length > max) throw new AppError("validation_failed", 400, { [field]: code });
  return masked;
}

/** Optional fields: blank text is stored as absent. */
export function maskOptional(field: MaskedField, text: string | undefined): string | null {
  return text === undefined || text.trim() === "" ? null : maskWithin(field, text);
}
