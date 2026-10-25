import { z } from "zod";
import { countrySchema } from "../accounts/fields.js";
import { optionalFilter } from "../routes/fields.js";

export const rankingSizeMax = 100;

export const pointsBreakdownSchema = z.object({
  routes: z.number().int(),
  checks: z.number().int(),
  potholes: z.number().int(),
  accepted: z.number().int(),
  useful: z.number().int(),
  articles: z.number().int(),
  stars: z.number().int(),
});

export const countryRankSchema = z.object({
  rank: z.number().int(),
  country: z.string(),
  points: z.number().int(),
  developers: z.number().int(),
});

export const developerRankSchema = z.object({
  rank: z.number().int(),
  handle: z.string(),
  country: z.string(),
  points: z.number().int(),
});

export const developerRankingQuery = z.object({ country: optionalFilter(countrySchema) });

export type CountryRank = z.infer<typeof countryRankSchema>;
export type DeveloperRank = z.infer<typeof developerRankSchema>;
export type DeveloperRankingQuery = z.infer<typeof developerRankingQuery>;
