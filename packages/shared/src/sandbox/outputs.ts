import { scenarios } from "@overpass/simulator";
import { z } from "zod";
import { sandboxTargets } from "./inputs.js";

export const deliveryStatuses = ["scheduled", "sent", "delivered", "failed"] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

const headersSchema = z.record(z.string(), z.string());

export const sandboxKeySchema = z.object({
  id: z.uuid(),
  provider: z.string(),
  scenario: z.enum(scenarios),
  target: z.enum(sandboxTargets),
  webhookUrl: z.string().nullable(),
  prefix: z.string(),
  quota: z.number().int(),
  webhookSecret: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

/** The only response that carries the full key: it is never shown again. */
export const sandboxKeyCreatedSchema = sandboxKeySchema.extend({ key: z.string() });

export const sandboxDeliverySchema = z.object({
  id: z.uuid(),
  eventType: z.string(),
  target: z.enum(sandboxTargets),
  status: z.enum(deliveryStatuses),
  attempts: z.number().int(),
  body: z.string(),
  headers: headersSchema,
  responseStatus: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  dueAt: z.string(),
  deliveredAt: z.string().nullable(),
});

export const sandboxEventSchema = z.object({
  id: z.uuid(),
  cursor: z.number().int(),
  provider: z.string(),
  scenario: z.enum(scenarios),
  request: z.object({
    method: z.string(),
    path: z.string(),
    headers: headersSchema,
    body: z.string(),
  }),
  response: z.object({ status: z.number().int(), body: z.unknown() }),
  deliveries: z.array(sandboxDeliverySchema),
  createdAt: z.string(),
});

export const sandboxProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  countries: z.array(z.string()),
  docsUrl: z.string(),
  docsVersion: z.string(),
  consultedAt: z.string(),
  officialSandboxUrl: z.string().nullable(),
  unofficial: z.literal(true),
  summary: z.string(),
  notes: z.array(z.string()),
});

export type SandboxKey = z.infer<typeof sandboxKeySchema>;
export type SandboxKeyCreated = z.infer<typeof sandboxKeyCreatedSchema>;
export type SandboxDelivery = z.infer<typeof sandboxDeliverySchema>;
export type SandboxEvent = z.infer<typeof sandboxEventSchema>;
export type SandboxProvider = z.infer<typeof sandboxProviderSchema>;
