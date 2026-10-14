import { z } from "zod";

const amount = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0);
const httpsUrl = z.url({ protocol: /^https$/ });
const mobile = z.string().regex(/^\+\d{6,15}$/);

/** POST /v1/checkout/sessions, with the Amount and Currency rules of the reference. */
export const sessionCreateBody = z
  .object({
    amount,
    currency: z.string().regex(/^[A-Z]{3}$/),
    error_url: httpsUrl,
    success_url: httpsUrl,
    client_reference: z.string().max(255).optional(),
    restrict_payer_mobile: mobile.optional(),
    enforce_payer_mobile: mobile.optional(),
    aggregated_merchant_id: z.string().min(1).optional(),
  })
  .refine((body) => body.currency !== "XOF" || !body.amount.includes("."), { path: ["amount"] });

const paymentError = z.object({ code: z.string(), message: z.string() });

export const checkoutSession = z.object({
  id: z.string(),
  amount: z.string(),
  checkout_status: z.enum(["open", "complete", "expired"]),
  client_reference: z.string().nullable(),
  currency: z.string(),
  error_url: z.string(),
  last_payment_error: paymentError.nullable(),
  business_name: z.string(),
  payment_status: z.enum(["processing", "cancelled", "succeeded"]),
  transaction_id: z.string(),
  aggregated_merchant_id: z.string().optional(),
  restrict_payer_mobile: z.string().optional(),
  enforce_payer_mobile: z.string().optional(),
  success_url: z.string(),
  wave_launch_url: z.string(),
  when_completed: z.string().nullable(),
  when_created: z.string(),
  when_expires: z.string(),
});

export const waveError = z.object({ code: z.string(), message: z.string() });
export const validationError = waveError.extend({
  details: z.array(z.object({ loc: z.array(z.string()), msg: z.string() })),
});
export const searchResult = z.object({ result: z.array(checkoutSession) });
export const transactionQuery = z.object({ transaction_id: z.string() });
export const referenceQuery = z.object({ client_reference: z.string() });

const event = <Type extends string, Data extends z.ZodType>(type: Type, data: Data) =>
  z.object({ id: z.string(), type: z.literal(type), data });

/** Webhook bodies as documented on https://docs.wave.com/webhook. */
export const waveEvents = {
  "checkout.session.completed": event("checkout.session.completed", checkoutSession),
  "checkout.session.payment_failed": event(
    "checkout.session.payment_failed",
    z.object({
      id: z.string(),
      payment_status: z.literal("failed"),
      checkout_status: z.literal("failed"),
      last_payment_error: paymentError,
    }),
  ),
};
