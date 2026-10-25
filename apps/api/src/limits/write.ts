import { writeQuota } from "@overpass/shared";
import type { FastifyRequest } from "fastify";
import type { AccountResolver } from "../modules/accounts/index.js";
import type { TrustSource } from "../modules/ranking/index.js";
import type { RouteLimit } from "./plugin.js";

/** Whether the account behind a request is a confirmed member. */
export type RequestTrust = (request: FastifyRequest) => Promise<boolean>;

export type WriteLimit = {
  max: (request: FastifyRequest) => Promise<number>;
  timeWindow: number;
};

/** An anonymous request, or one whose account cannot be read, keeps the base budget. */
export function confirmedRequests(resolve: AccountResolver, trust: TrustSource): RequestTrust {
  return async (request) => {
    try {
      const account = await resolve(request);
      return account !== null && (await trust.isConfirmed(account.id));
    } catch {
      return false;
    }
  };
}

/** Per-IP budget of a write route, wider for a confirmed member. */
export function writeLimit(base: RouteLimit, confirmed: RequestTrust): WriteLimit {
  return {
    max: async (request) => writeQuota(base.max, await confirmed(request)),
    timeWindow: base.timeWindow,
  };
}
