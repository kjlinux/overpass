import { z } from "zod";

/** The currencies of the countries where CinetPay's coverage is confirmed. */
export const currencies = ["XOF", "XAF", "GNF", "CDF"] as const;
export const statuses = ["PENDING", "SUCCESS", "FAILED", "INSUFFICIENT_BALANCE"] as const;

const url = z.url().max(2048);
const name = z.string().max(100);

export const loginInput = z.object({
  api_key: z.string().min(1).max(100),
  api_password: z.string().min(1).max(100),
});

export const loginResponse = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int(),
});

/** Field names follow the README in snake_case; which ones are required is a simulator choice. */
export const paymentInput = z.object({
  currency: z.enum(currencies),
  merchant_transaction_id: z.string().min(1).max(100),
  amount: z.number().int().positive(),
  success_url: url,
  failed_url: url,
  notify_url: url,
  lang: z.enum(["fr", "en"]).optional(),
  designation: z.string().max(200).optional(),
  payment_method: z
    .string()
    .regex(/^[A-Z0-9]+_[A-Z]{2}$/)
    .optional(),
  client_first_name: name.optional(),
  client_last_name: name.optional(),
  client_email: z.email().max(254).optional(),
  client_phone_number: z
    .string()
    .regex(/^\+\d{6,15}$/)
    .optional(),
});

export type PaymentInput = z.infer<typeof paymentInput>;

const identifiers = {
  merchant_transaction_id: z.string(),
  transaction_id: z.string(),
};

export const paymentCreated = z.object({
  ...identifiers,
  status: z.literal("PENDING"),
  payment_url: z.string(),
  notify_token: z.string(),
});

export const paymentView = z.object({
  ...identifiers,
  amount: z.string(),
  currency: z.enum(currencies),
  status: z.enum(statuses),
  payment_method: z.string().nullable(),
  designation: z.string().nullable(),
});

export const notification = z.object({
  notify_token: z.string(),
  ...identifiers,
  status: z.enum(statuses),
});

export const refusal = z.object({ code: z.number(), status: z.string(), message: z.string() });
