import { z } from "zod";

const record = z.record(z.string(), z.unknown());

/** Required by the documentation: invoice.total_amount and store.name; the rest is optional. */
export const invoiceInput = z.object({
  invoice: z.object({
    total_amount: z.number().positive(),
    description: z.string().optional(),
    items: record.optional(),
    taxes: record.optional(),
    customer: z
      .object({ name: z.string(), email: z.string(), phone: z.string() })
      .partial()
      .optional(),
    channels: z.union([z.string(), z.array(z.string())]).optional(),
  }),
  store: z.object({
    name: z.string().min(1),
    tagline: z.string().optional(),
    postal_address: z.string().optional(),
    phone: z.string().optional(),
    logo_url: z.string().optional(),
    website_url: z.string().optional(),
  }),
  custom_data: record.optional(),
  actions: z
    .object({ cancel_url: z.string(), return_url: z.string(), callback_url: z.string() })
    .partial()
    .optional(),
});

export type InvoiceInput = z.infer<typeof invoiceInput>;

export const invoiceCreated = z.object({
  response_code: z.literal("00"),
  response_text: z.string(),
  description: z.string(),
  token: z.string(),
});

export const confirmResponse = z.object({
  response_code: z.literal("00"),
  response_text: z.string(),
  hash: z.string(),
  invoice: z.object({
    items: record,
    taxes: record,
    token: z.string(),
    total_amount: z.number(),
    description: z.string(),
  }),
  custom_data: record,
  actions: record,
  mode: z.string(),
  status: z.enum(["pending", "completed", "cancelled", "failed"]),
  fail_reason: z.string(),
  customer: record,
  receipt_url: z.string(),
});

export const refusal = z.object({ response_code: z.string(), response_text: z.string() });

export const ipnEvents = { completed: confirmResponse, failed: confirmResponse };
