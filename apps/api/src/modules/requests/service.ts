import type { RequestsDeps } from "./service/context.js";
import { proposalService } from "./service/proposals.js";
import { voteService } from "./service/votes.js";

export type { RequestsDeps } from "./service/context.js";

/** Business rules of the requests module, independent of HTTP and SQL. */
export function createRequestsService(deps: RequestsDeps) {
  return { ...proposalService(deps), ...voteService(deps) };
}

export type RequestsService = ReturnType<typeof createRequestsService>;
