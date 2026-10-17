import { defaultProviders } from "@overpass/providers";
import { SimulatorRegistry } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { AccountResolver } from "../accounts/index.js";
import { createSandboxRepository } from "./repository.js";
import { registerSandboxRoutes } from "./routes.js";
import { createSandboxService } from "./service.js";

export type SandboxOptions = {
  db: Database;
  resolveAccount: AccountResolver;
  registry?: SimulatorRegistry;
};

export async function registerSandbox(
  app: FastifyInstance,
  options: SandboxOptions,
): Promise<void> {
  const registry = options.registry ?? new SimulatorRegistry();
  if (options.registry === undefined) {
    for (const provider of defaultProviders) {
      registry.register(provider);
    }
  }

  const repository = createSandboxRepository(options.db);
  const service = createSandboxService(repository, registry);

  await app.register((scope) => {
    registerSandboxRoutes({
      app: scope,
      service,
      resolve: options.resolveAccount,
    });
    return Promise.resolve();
  });
}
