import { ok, pickLanguage } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import {
  sandboxEventsQuery,
  sandboxIdParams,
  sandboxKeyCreateInput,
  sandboxKeyUpdateInput,
} from "./schemas.js";
import type { SandboxService } from "./service.js";

const hour = 60 * 60 * 1000;

/** Creating keys is rare; reading the inspector is polled by the trial page. */
const limits = {
  create: { max: 20, timeWindow: hour },
  manage: { max: 120, timeWindow: hour },
  read: { max: 1200, timeWindow: hour },
};

type Context = { app: FastifyInstance; service: SandboxService; resolve: AccountResolver };

function keyRoutes({ app, service, resolve }: Context): void {
  const create = { config: { rateLimit: limits.create } };
  const manage = { config: { rateLimit: limits.manage } };
  app.post("/v1/sandbox/keys", create, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const input = parseInput(sandboxKeyCreateInput, request.body);
    return reply.code(201).send(ok(await service.createKey(account, input)));
  });
  app.get("/v1/sandbox/keys", async (request) =>
    ok(await service.listKeys(await requireAccount(resolve, request))),
  );
  app.patch("/v1/sandbox/keys/:id", manage, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(sandboxIdParams, request.params);
    return ok(
      await service.updateKey(account, id, parseInput(sandboxKeyUpdateInput, request.body)),
    );
  });
  app.delete("/v1/sandbox/keys/:id", manage, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(sandboxIdParams, request.params);
    await service.revokeKey(account, id);
    return ok(null);
  });
}

function readRoutes({ app, service, resolve }: Context): void {
  const read = { config: { rateLimit: limits.read } };
  app.get("/v1/sandbox/providers", (request, reply) =>
    reply.send(ok(service.providers(pickLanguage(request.headers["accept-language"])))),
  );
  app.get("/v1/sandbox/events", read, async (request) => {
    const account = await requireAccount(resolve, request);
    const { keyId, before } = parseInput(sandboxEventsQuery, request.query);
    return ok(await service.events(account, keyId, before));
  });
}

export function registerSandboxRoutes(
  app: FastifyInstance,
  service: SandboxService,
  resolve: AccountResolver,
): void {
  const context = { app, service, resolve };
  keyRoutes(context);
  readRoutes(context);
}
