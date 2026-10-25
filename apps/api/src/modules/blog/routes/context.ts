import type { FastifyInstance } from "fastify";
import type { RequestTrust } from "../../../limits/index.js";
import type { AccountResolver } from "../../accounts/index.js";
import type { BlogService } from "../service.js";

export type Context = {
  app: FastifyInstance;
  service: BlogService;
  resolve: AccountResolver;
  confirmed: RequestTrust;
};

const minute = 60 * 1000;
const hour = 60 * minute;

/** Per-IP budgets: reads are cheap, publishing is rare, comments and stars are bounded clicks. */
export const limits = {
  read: { max: 240, timeWindow: minute },
  publish: { max: 20, timeWindow: hour },
  comment: { max: 30, timeWindow: hour },
  click: { max: 120, timeWindow: hour },
};
