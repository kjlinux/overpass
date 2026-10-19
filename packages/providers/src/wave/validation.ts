import type { z } from "zod";
import { invalidValue, missing } from "./errors.js";
import type { Detail } from "./errors.js";
import { sessionCreateBody } from "./schemas.js";

export type SessionInput = Omit<z.infer<typeof sessionCreateBody>, "enforce_payer_mobile">;

function detail(issue: z.core.$ZodIssue, body: Record<string, unknown>): Detail {
  const field = String(issue.path[0] ?? "body");
  return body[field] === undefined || body[field] === null ? missing(field) : invalidValue(field);
}

/** The same schema documents the endpoint and checks it, so both say the same thing. */
export function validateSession(raw: unknown): { input: SessionInput } | { details: Detail[] } {
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const parsed = sessionCreateBody.safeParse(body);
  if (!parsed.success) {
    const fields = new Map(
      parsed.error.issues.map((issue) => [String(issue.path[0]), detail(issue, body)]),
    );
    return { details: [...fields.values()] };
  }
  const { enforce_payer_mobile: alias, restrict_payer_mobile: mobile, ...rest } = parsed.data;
  const payer = mobile ?? alias;
  return { input: { ...rest, ...(payer === undefined ? {} : { restrict_payer_mobile: payer }) } };
}
