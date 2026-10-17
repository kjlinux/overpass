import { z } from "zod";

export const sandboxScenarioSchema = z.enum([
  "payment_success",
  "insufficient_funds",
  "operator_timeout",
  "duplicate_webhook",
  "delayed_webhook",
]);

export const sandboxMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const sandboxKeyCreateInput = z.strictObject({
  provider: z.string().trim().min(1).max(32),
  expiresHours: z.number().int().min(1).max(168).optional(),
});

export const sandboxSimulationInput = z.strictObject({
  scenario: sandboxScenarioSchema,
  method: sandboxMethodSchema.default("POST"),
  path: z.string().trim().min(1).max(256),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.record(z.string(), z.unknown()).optional(),
  webhookUrl: z.url().max(512).optional(),
  secret: z.string().max(128).optional(),
});

export type SandboxScenario = z.infer<typeof sandboxScenarioSchema>;
export type SandboxKeyCreateInput = z.infer<typeof sandboxKeyCreateInput>;
export type SandboxSimulationInput = z.infer<typeof sandboxSimulationInput>;
