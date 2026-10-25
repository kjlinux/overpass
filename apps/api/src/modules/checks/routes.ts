import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { writeLimit } from "../../limits/index.js";
import type { RequestTrust } from "../../limits/index.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import { checkCreateInput, idParams, potholeCreateInput, potholeUpdateInput } from "./schemas.js";
import type { ChecksService } from "./service.js";

const hour = 60 * 60 * 1000;

/** Per-IP budgets: a check is one click, a report is a short text. */
const limits = {
  checks: { max: 30, timeWindow: hour },
  potholes: { max: 20, timeWindow: hour },
  statuses: { max: 60, timeWindow: hour },
};

type Context = {
  app: FastifyInstance;
  service: ChecksService;
  resolve: AccountResolver;
  confirmed: RequestTrust;
};

function checkRoutes({ app, service, resolve, confirmed }: Context): void {
  const options = { config: { rateLimit: writeLimit(limits.checks, confirmed) } };
  app.post("/v1/routes/:id/checks", options, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(checkCreateInput, request.body);
    return reply.code(201).send(ok(await service.createCheck(account, id, input)));
  });
  app.get("/v1/me/checks", async (request) =>
    ok(await service.myChecks(await requireAccount(resolve, request))),
  );
}

function potholeRoutes({ app, service, resolve, confirmed }: Context): void {
  const reportOptions = { config: { rateLimit: writeLimit(limits.potholes, confirmed) } };
  app.post("/v1/routes/:id/potholes", reportOptions, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(potholeCreateInput, request.body);
    return reply.code(201).send(ok(await service.reportPothole(account, id, input)));
  });
  const statusOptions = { config: { rateLimit: limits.statuses } };
  app.patch("/v1/potholes/:id", statusOptions, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(potholeUpdateInput, request.body);
    return ok(await service.updatePothole(account, id, input));
  });
}

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export function registerChecksRoutes(
  app: FastifyInstance,
  service: ChecksService,
  resolve: AccountResolver,
  confirmed: RequestTrust,
): void {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });
  checkRoutes({ app, service, resolve, confirmed });
  potholeRoutes({ app, service, resolve, confirmed });
}
