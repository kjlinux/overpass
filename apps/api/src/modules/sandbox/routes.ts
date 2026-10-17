import { ok } from "@overpass/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "../../http/app-error.js";
import { parseInput } from "../../http/validate.js";
import type { AccountResolver } from "../accounts/index.js";
import { sandboxKeyCreateInput, sandboxSimulationInput } from "./schemas.js";
import type { SandboxService } from "./service.js";

const minute = 60 * 1000;
const hour = 60 * 60 * 1000;

const limits = {
  createKey: { max: 20, timeWindow: hour },
  simulate: { max: 120, timeWindow: minute },
  events: { max: 120, timeWindow: minute },
};

type Context = {
  app: FastifyInstance;
  service: SandboxService;
  resolve: AccountResolver;
};

function readSandboxKey(request: FastifyRequest): string | undefined {
  const header = request.headers["x-sandbox-key"];
  if (typeof header === "string" && header.startsWith("sbk_")) return header;
  const query = request.query as Record<string, unknown> | undefined;
  if (typeof query?.key === "string" && query.key.startsWith("sbk_")) return query.key;
  return undefined;
}

function registerKeyRoutes({ app, service, resolve }: Context): void {
  app.post(
    "/v1/sandbox/keys",
    { config: { rateLimit: limits.createKey } },
    async (request, reply) => {
      const account = await resolve(request);
      const input = parseInput(sandboxKeyCreateInput, request.body);
      const created = await service.createKey({
        userId: account?.id ?? null,
        provider: input.provider,
        expiresHours: input.expiresHours,
      });
      return reply.code(201).send(ok(created));
    },
  );

  app.get("/v1/sandbox/events", { config: { rateLimit: limits.events } }, async (request) => {
    const key = readSandboxKey(request);
    if (key === undefined) throw new AppError("sandbox_key_invalid", 401);
    return ok(await service.listEvents(key));
  });
}

function registerSimulateRoute({ app, service }: Context): void {
  app.post(
    "/v1/sandbox/:provider/*",
    { config: { rateLimit: limits.simulate } },
    async (request) => {
      const { provider } = request.params as { provider: string };
      const rawKey = readSandboxKey(request);
      const input = parseInput(sandboxSimulationInput, request.body);
      return ok(await service.simulate({ rawKey, providerId: provider, input }));
    },
  );
}

export function registerSandboxRoutes(ctx: Context): void {
  registerKeyRoutes(ctx);
  registerSimulateRoute(ctx);
}
