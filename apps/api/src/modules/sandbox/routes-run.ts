import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import type { RunService } from "./runs.js";
import { sandboxDemoInput, sandboxIdParams, sandboxRunInput } from "./schemas.js";

const minute = 60_000;

/** A demo creates a key and a call: ten a minute per address is plenty for a person. */
const limits = {
  run: { max: 60, timeWindow: minute },
  demo: { max: 10, timeWindow: minute },
  demoRead: { max: 240, timeWindow: minute },
};

export function registerRunRoutes(
  app: FastifyInstance,
  runs: RunService,
  resolve: AccountResolver,
): void {
  app.post(
    "/v1/sandbox/keys/:id/run",
    { config: { rateLimit: limits.run } },
    async (request, reply) => {
      const account = await requireAccount(resolve, request);
      const { id } = parseInput(sandboxIdParams, request.params);
      const { scenario } = parseInput(sandboxRunInput, request.body);
      return reply.code(201).send(ok(await runs.runKey(account, id, scenario)));
    },
  );
  app.post("/v1/sandbox/demo", { config: { rateLimit: limits.demo } }, async (request, reply) => {
    const { scenario } = parseInput(sandboxDemoInput, request.body);
    return reply.code(201).send(ok(await runs.startDemo(scenario)));
  });
  app.get(
    "/v1/sandbox/demo/events/:id",
    { config: { rateLimit: limits.demoRead } },
    async (request) => {
      const { id } = parseInput(sandboxIdParams, request.params);
      return ok(await runs.demoEvent(id));
    },
  );
}
