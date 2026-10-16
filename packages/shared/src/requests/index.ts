import { z } from "zod";
import { codeOr, countrySchema } from "../accounts/fields.js";
import { serviceCategories } from "../routes/outputs.js";

export const proposalStatuses = ["pending", "accepted", "rejected"] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];

const nameSchema = z
  .string({ error: codeOr("service_name_invalid") })
  .trim()
  .min(2, { error: "service_name_invalid" })
  .max(60, { error: "service_name_invalid" });

/** Only a public https page; the server never fetches it. */
const docsUrlSchema = z
  .string({ error: codeOr("docs_url_invalid") })
  .trim()
  .max(500, { error: "docs_url_invalid" })
  .refine((value) => URL.canParse(value) && new URL(value).protocol === "https:", {
    error: "docs_url_invalid",
  });

export const proposalCreateInput = z.strictObject({
  name: nameSchema,
  category: z.enum(serviceCategories, { error: codeOr("category_invalid") }),
  country: countrySchema,
  docsUrl: docsUrlSchema,
});

export const proposalDecisionInput = z.strictObject({
  decision: z.enum(["accept", "reject"], { error: codeOr("decision_invalid") }),
  reason: z.string().trim().max(500, { error: "reason_invalid" }).optional(),
});

export const proposalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.enum(serviceCategories),
  country: z.string(),
  docsUrl: z.string(),
  status: z.enum(proposalStatuses),
  reason: z.string().nullable(),
  author: z.string(),
  service: z.string().nullable(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
});

export const simulatorVoteSchema = z.object({
  service: z.string(),
  simulated: z.boolean(),
  votes: z.number().int(),
  voted: z.boolean(),
});

export const simulatorRequestSchema = z.object({
  rank: z.number().int(),
  service: z.object({ slug: z.string(), name: z.string(), category: z.enum(serviceCategories) }),
  votes: z.number().int(),
});

export const serviceSlugParams = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/, { error: "service_invalid" }),
});

export type ProposalCreateInput = z.infer<typeof proposalCreateInput>;
export type ProposalDecisionInput = z.infer<typeof proposalDecisionInput>;
export type Proposal = z.infer<typeof proposalSchema>;
export type SimulatorVote = z.infer<typeof simulatorVoteSchema>;
export type SimulatorRequest = z.infer<typeof simulatorRequestSchema>;
