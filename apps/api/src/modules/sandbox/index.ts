import type { ProviderAdapter } from "@overpass/simulator";
import { createSimulator } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { CounterStore } from "../../limits/index.js";
import type { AccountResolver } from "../accounts/index.js";
import { createGateway } from "./gateway.js";
import { registerGatewayRoutes } from "./gateway-routes.js";
import { systemResolver } from "./network/resolve.js";
import { registerOpenApiRoute } from "./openapi/route.js";
import type { HostResolver } from "./network/resolve.js";
import { eventLookup, eventsRepository, keysRepository } from "./repository.js";
import { registerRunRoutes } from "./routes-run.js";
import { createRunService } from "./runs.js";
import { memoryBus } from "./relay/bus.js";
import type { RelayBus } from "./relay/bus.js";
import { createRelayHub } from "./relay/hub.js";
import { relayRepository } from "./relay/repository.js";
import { registerRelayRoutes } from "./relay/routes.js";
import { registerSandboxRoutes } from "./routes.js";
import { createSandboxService } from "./service.js";

export { isPublicAddress } from "./network/addresses.js";
export { publicAddresses, systemResolver } from "./network/resolve.js";
export type { HostResolver } from "./network/resolve.js";
export { buildSandboxOpenApi, openApiFile } from "./openapi/build.js";
export { memoryBus, postgresBus } from "./relay/bus.js";
export type { RelayBus } from "./relay/bus.js";

export type SandboxOptions = {
  db: Database;
  counters: CounterStore;
  providers: readonly ProviderAdapter[];
  resolveAccount: AccountResolver;
  serverSecret: string;
  webOrigin: string;
  resolveHost?: HostResolver;
  bus?: RelayBus;
  demoProvider?: string;
  now: () => Date;
};

function relayParts(options: SandboxOptions, keys: ReturnType<typeof keysRepository>) {
  const relays = relayRepository(options.db);
  const hub = createRelayHub(options.bus ?? memoryBus(), relays);
  return {
    keys,
    relays,
    hub,
    resolve: options.resolveAccount,
    counters: options.counters,
    now: options.now,
  };
}

function buildSandbox(options: SandboxOptions) {
  const { db, now } = options;
  const simulator = createSimulator(options.providers);
  const keys = keysRepository(db);
  const events = eventsRepository(db);
  const resolveHost = options.resolveHost ?? systemResolver;
  const service = createSandboxService({
    keys,
    events,
    simulator,
    resolveHost,
    serverSecret: options.serverSecret,
    now,
  });
  const counters = options.counters;
  const gateway = createGateway({
    db,
    keys,
    events,
    simulator,
    counters,
    webOrigin: options.webOrigin,
    now,
  });
  const demoProvider = options.demoProvider ?? "wave";
  const runs = createRunService({
    keys,
    lookup: eventLookup(db),
    gateway,
    simulator,
    demoProvider,
    now,
  });
  return { service, gateway, runs, relayDeps: relayParts(options, keys) };
}

/** Mounts key management and, in a scope of its own, the raw provider gateway. */
export async function registerSandbox(
  app: FastifyInstance,
  options: SandboxOptions,
): Promise<void> {
  const { service, gateway, runs, relayDeps } = buildSandbox(options);
  await app.register((scope) => {
    registerSandboxRoutes(scope, service, options.resolveAccount);
    registerRelayRoutes(scope, relayDeps);
    registerRunRoutes(scope, runs, options.resolveAccount);
    registerOpenApiRoute(scope, options.providers);
    return Promise.resolve();
  });
  await app.register((scope) => {
    registerGatewayRoutes(scope, gateway);
    return Promise.resolve();
  });
}

export { createDeliveryWorker, relayChannel } from "./delivery/worker.js";
export type { DeliveryWorker, Notifier } from "./delivery/worker.js";
export { defaultLoop, startWorkerLoop } from "./delivery/loop.js";
export { postgresNotifier } from "./delivery/notifier.js";
