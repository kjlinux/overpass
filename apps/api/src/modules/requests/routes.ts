import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import {
  idParams,
  proposalCreateInput,
  proposalDecisionInput,
  serviceSlugParams,
} from "./schemas.js";
import type { RequestsService } from "./service.js";

const minute = 60 * 1000;
const hour = 60 * minute;

/** Per-IP budgets: a proposal is rare, a vote is one click, reads are cheap. */
const limits = {
  propose: { max: 10, timeWindow: hour },
  vote: { max: 60, timeWindow: hour },
  read: { max: 240, timeWindow: minute },
};

type Context = { app: FastifyInstance; service: RequestsService; resolve: AccountResolver };

function proposalRoutes({ app, service, resolve }: Context): void {
  const options = { config: { rateLimit: limits.propose } };
  app.post("/v1/service-proposals", options, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const input = parseInput(proposalCreateInput, request.body);
    return reply.code(201).send(ok(await service.propose(account, input)));
  });
  app.get("/v1/me/service-proposals", async (request) =>
    ok(await service.mine(await requireAccount(resolve, request))),
  );
  app.get("/v1/admin/service-proposals", async (request) =>
    ok(await service.pending(await requireAccount(resolve, request))),
  );
  app.post("/v1/admin/service-proposals/:id", async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    return ok(await service.decide(account, id, parseInput(proposalDecisionInput, request.body)));
  });
}

function voteRoutes({ app, service, resolve }: Context): void {
  const read = { config: { rateLimit: limits.read } };
  const write = { config: { rateLimit: limits.vote } };
  const path = "/v1/services/:slug/simulator-vote";
  app.get(path, read, async (request) => {
    const { slug } = parseInput(serviceSlugParams, request.params);
    return ok(await service.tally(slug, await resolve(request)));
  });
  app.put(path, write, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.vote(account, parseInput(serviceSlugParams, request.params).slug));
  });
  app.delete(path, write, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.withdraw(account, parseInput(serviceSlugParams, request.params).slug));
  });
  app.get("/v1/simulator-requests", read, async () => ok(await service.ranking()));
}

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export function registerRequestsRoutes(
  app: FastifyInstance,
  service: RequestsService,
  resolve: AccountResolver,
): void {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });
  proposalRoutes({ app, service, resolve });
  voteRoutes({ app, service, resolve });
}
