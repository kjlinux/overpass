import { z } from "zod";
import { sandboxScenarioSchema } from "./inputs.js";

export const sandboxKeyOutputSchema = z.strictObject({
  id: z.uuid(),
  key: z.string().startsWith("sbk_"),
  provider: z.string(),
  quotaRemaining: z.number().int(),
  expiresAt: z.string(),
});

export const sandboxWebhookOutputSchema = z.strictObject({
  delayMs: z.number().int(),
  headers: z.record(z.string(), z.string()),
  payload: z.unknown(),
  duplicateOf: z.number().int().optional(),
  delivered: z.boolean().optional(),
  deliveryStatus: z.number().int().optional(),
});

export const sandboxEventOutputSchema = z.strictObject({
  id: z.uuid(),
  scenario: sandboxScenarioSchema,
  requestMethod: z.string(),
  requestPath: z.string(),
  requestHeaders: z.record(z.string(), z.string()),
  requestBody: z.unknown().optional(),
  responseStatus: z.number().int(),
  responseHeaders: z.record(z.string(), z.string()),
  responseBody: z.unknown().optional(),
  webhooks: z.array(sandboxWebhookOutputSchema),
  createdAt: z.string(),
});

export type SandboxKeyOutput = z.infer<typeof sandboxKeyOutputSchema>;
export type SandboxEventOutput = z.infer<typeof sandboxEventOutputSchema>;
