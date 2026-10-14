import { invalidValue, missing } from "./errors.js";
import type { Detail } from "./errors.js";

export type SessionInput = {
  amount: string;
  currency: string;
  error_url: string;
  success_url: string;
  client_reference?: string;
  restrict_payer_mobile?: string;
  aggregated_merchant_id?: string;
};

const amountPattern = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
const currencyPattern = /^[A-Z]{3}$/;
const mobilePattern = /^\+\d{6,15}$/;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function amountIsValid(amount: string, currency: unknown): boolean {
  if (!amountPattern.test(amount) || Number(amount) <= 0) return false;
  return currency !== "XOF" || !amount.includes(".");
}

type Check = [
  field: string,
  required: boolean,
  valid: (value: string, body: Record<string, unknown>) => boolean,
];

/** Rules from the Amount, Currency and Create sections of the Checkout reference. */
const checks: Check[] = [
  ["amount", true, (value, body) => amountIsValid(value, body.currency)],
  ["currency", true, (value) => currencyPattern.test(value)],
  ["error_url", true, isHttpsUrl],
  ["success_url", true, isHttpsUrl],
  ["client_reference", false, (value) => value.length <= 255],
  ["restrict_payer_mobile", false, (value) => mobilePattern.test(value)],
  ["aggregated_merchant_id", false, (value) => value.length > 0],
];

/** Returns the session input, or the details of a request-validation-error. */
export function validateSession(raw: unknown): { input: SessionInput } | { details: Detail[] } {
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const mobile = body.restrict_payer_mobile ?? body.enforce_payer_mobile;
  const values: Record<string, unknown> = { ...body, restrict_payer_mobile: mobile };
  const details = checks.flatMap(([field, required, valid]) => {
    const value = values[field];
    if (value === undefined || value === null) return required ? [missing(field)] : [];
    return typeof value === "string" && valid(value, body) ? [] : [invalidValue(field)];
  });
  if (details.length > 0) return { details };
  const input = Object.fromEntries(
    checks.map(([field]) => [field, values[field]]).filter(([, value]) => value !== undefined),
  ) as SessionInput;
  return { input };
}
