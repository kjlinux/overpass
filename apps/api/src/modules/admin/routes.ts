import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import {
  adminAccountsQuery,
  adminLogQuery,
  adminQueueQuery,
  idParams,
  routeModerationInput,
  suspensionInput,
} from "./schemas.js";
import type { AdminService } from "./service.js";

const minute = 60 * 1000;

/** Per-IP budgets: a moderator browses quickly, decisions are rarer. */
const limits = {
  read: { max: 120, timeWindow: minute },
  decide: { max: 60, timeWindow: minute },
};

type Context = { app: FastifyInstance; service: AdminService; resolve: AccountResolver };

function readRoutes({ app, service, resolve }: Context): void {
  const options = { config: { rateLimit: limits.read } };
  app.get("/v1/admin/queue", options, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.queue(account, parseInput(adminQueueQuery, request.query)));
  });
  app.get("/v1/admin/accounts", options, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.accounts(account, parseInput(adminAccountsQuery, request.query)));
  });
  app.get("/v1/admin/log", options, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.log(account, parseInput(adminLogQuery, request.query)));
  });
}

function decisionRoutes({ app, service, resolve }: Context): void {
  const options = { config: { rateLimit: limits.decide } };
  app.post("/v1/admin/routes/:id/moderation", options, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(routeModerationInput, request.body);
    return ok(await service.moderateRoute(account, id, input));
  });
  app.post("/v1/admin/accounts/:id/suspend", options, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    const { reason } = parseInput(suspensionInput, request.body);
    return ok(await service.suspend(account, id, reason));
  });
  app.post("/v1/admin/accounts/:id/reactivate", options, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    return ok(await service.reactivate(account, id));
  });
}

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export function registerAdminRoutes(
  app: FastifyInstance,
  service: AdminService,
  resolve: AccountResolver,
): void {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });
  readRoutes({ app, service, resolve });
  decisionRoutes({ app, service, resolve });
}
