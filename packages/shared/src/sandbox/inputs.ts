import { scenarios } from "@overpass/simulator";

export { scenarios } from "@overpass/simulator";
export type { Scenario } from "@overpass/simulator";
import { z } from "zod";
import { codeOr } from "../accounts/fields.js";
import { idSchema, serviceSlugSchema } from "../routes/fields.js";

/** Where a key's webhooks go: the built-in receiver, a public URL, or the local relay. */
export const sandboxTargets = ["inbox", "url", "relay"] as const;
export type SandboxTarget = (typeof sandboxTargets)[number];

export const scenarioSchema = z.enum(scenarios, { error: codeOr("scenario_invalid") });
const targetSchema = z.enum(sandboxTargets, { error: codeOr("target_invalid") });
const webhookUrlSchema = z
  .url({ protocol: /^https?$/, error: "webhook_url_invalid" })
  .max(2048, { error: "webhook_url_invalid" });

function urlTargetHasUrl(input: {
  target?: SandboxTarget | undefined;
  webhookUrl?: string | undefined;
}) {
  return input.target !== "url" || input.webhookUrl !== undefined;
}

const urlRequired = { error: "webhook_url_required", path: ["webhookUrl"] };

export const sandboxKeyCreateInput = z
  .strictObject({
    provider: serviceSlugSchema,
    scenario: scenarioSchema.default("success"),
    target: targetSchema.default("inbox"),
    webhookUrl: webhookUrlSchema.optional(),
  })
  .refine(urlTargetHasUrl, urlRequired);

export const sandboxKeyUpdateInput = z
  .strictObject({
    scenario: scenarioSchema.optional(),
    target: targetSchema.optional(),
    webhookUrl: webhookUrlSchema.nullable().optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    error: "nothing_to_update",
  });

export const sandboxEventsQuery = z.object({
  keyId: idSchema,
  before: z.coerce
    .number({ error: "cursor_invalid" })
    .int({ error: "cursor_invalid" })
    .positive({ error: "cursor_invalid" })
    .optional(),
});

export const sandboxIdParams = z.object({ id: idSchema });

export type SandboxKeyCreateInput = z.infer<typeof sandboxKeyCreateInput>;
export type SandboxKeyUpdateInput = z.infer<typeof sandboxKeyUpdateInput>;

/** What the local relay reports after forwarding a webhook to the developer's server. */
export const relayResultInput = z.strictObject({
  status: z.number({ error: "result_invalid" }).int().min(100).max(599).nullable(),
  durationMs: z.number({ error: "result_invalid" }).int().min(0).max(600_000),
  error: z.enum(["timeout", "connection_failed"], { error: "result_invalid" }).optional(),
});

export type RelayResultInput = z.infer<typeof relayResultInput>;

/** The public demo shows one provider and three scenarios, the ones a newcomer understands at once. */
export const demoScenarios = ["success", "insufficient_funds", "duplicate_webhook"] as const;

export const sandboxRunInput = z.strictObject({ scenario: scenarioSchema.optional() });
export const sandboxDemoInput = z.strictObject({
  scenario: z.enum(demoScenarios, { error: codeOr("scenario_invalid") }),
});
