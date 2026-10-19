import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import {
  idParams,
  routeCreateInput,
  routeListQuery,
  routeReadQuery,
  routeReportInput,
  routeUpdateInput,
} from "./schemas.js";
import type { RoutesService } from "./service.js";

const hour = 60 * 60 * 1000;

const minute = 60 * 1000;

/** Per-IP budgets: reads run full-text and state SQL, publishing is rare, editing frequent. */
const limits = {
  list: { max: 120, timeWindow: minute },
  read: { max: 240, timeWindow: minute },
  create: { max: 20, timeWindow: hour },
  update: { max: 120, timeWindow: hour },
  remove: { max: 20, timeWindow: hour },
  report: { max: 30, timeWindow: hour },
};

type Context = { app: FastifyInstance; service: RoutesService; resolve: AccountResolver };

function readRoutes({ app, service, resolve }: Context): void {
  app.get("/v1/services", async () => ok(await service.services()));
  app.get("/v1/routes", { config: { rateLimit: limits.list } }, async (request) =>
    ok(await service.list(parseInput(routeListQuery, request.query))),
  );
  app.get("/v1/routes/:id", { config: { rateLimit: limits.read } }, async (request) => {
    const { id } = parseInput(idParams, request.params);
    const { lang } = parseInput(routeReadQuery, request.query);
    return ok(await service.read(id, await resolve(request), lang));
  });
  app.get("/v1/me/routes", async (request) =>
    ok(await service.mine(await requireAccount(resolve, request))),
  );
}

function writeRoutes({ app, service, resolve }: Context): void {
  app.post("/v1/routes", { config: { rateLimit: limits.create } }, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const id = await service.create(account, parseInput(routeCreateInput, request.body));
    return reply.code(201).send(ok(await service.read(id, account)));
  });
  app.patch("/v1/routes/:id", { config: { rateLimit: limits.update } }, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    await service.update(account, id, parseInput(routeUpdateInput, request.body));
    return ok(await service.read(id, account));
  });
  app.delete("/v1/routes/:id", { config: { rateLimit: limits.remove } }, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    await service.remove(account, id);
    return ok(null);
  });
}

function reportRoutes({ app, service, resolve }: Context): void {
  const options = { config: { rateLimit: limits.report } };
  app.post("/v1/routes/:id/reports", options, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    await service.report(account, id, parseInput(routeReportInput, request.body));
    return reply.code(201).send(ok({ reported: true }));
  });
}

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export function registerRoutesRoutes(
  app: FastifyInstance,
  service: RoutesService,
  resolve: AccountResolver,
): void {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });
  readRoutes({ app, service, resolve });
  writeRoutes({ app, service, resolve });
  reportRoutes({ app, service, resolve });
}
