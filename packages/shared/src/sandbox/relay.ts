import { z } from "zod";

/** Who produced a relayed request: the simulator today, a real provider's callback in P1. */
export const relaySources = ["simulated", "provider_callback"] as const;
export type RelaySource = (typeof relaySources)[number];

/** First frame of GET /v1/sandbox/listen. */
export const relayReadySchema = z.object({ provider: z.string(), keyPrefix: z.string() });

/** Each "webhook" frame; its SSE id is the delivery sequence used for Last-Event-ID. */
export const relayWebhookSchema = z.object({
  deliveryId: z.uuid(),
  eventType: z.string(),
  source: z.enum(relaySources),
  method: z.literal("POST"),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
});

/** P1, not built: a public HTTPS inbox whose real callbacks join the stream, kept 24 h at most. */
export const callbackInboxSchema = z.object({
  id: z.uuid(),
  keyId: z.uuid(),
  provider: z.string(),
  publicUrl: z.url(),
  retentionHours: z.literal(24),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export type RelayReady = z.infer<typeof relayReadySchema>;
export type RelayWebhook = z.infer<typeof relayWebhookSchema>;
export type CallbackInbox = z.infer<typeof callbackInboxSchema>;
