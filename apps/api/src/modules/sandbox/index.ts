import type { ProviderAdapter } from "@overpass/simulator";
import { createSimulator } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { CounterStore } from "../../limits/index.js";
import type { AccountResolver } from "../accounts/index.js";
import { createGateway } from "./gateway.js";
import { registerGatewayRoutes } from "./gateway-routes.js";
import { systemResolver } from "./network/resolve.js";
import type { HostResolver } from "./network/resolve.js";
import { eventsRepository, keysRepository } from "./repository.js";
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
  now: () => Date;
};

/** Mounts key management and, in a scope of its own, the raw provider gateway. */
export async function registerSandbox(
  app: FastifyInstance,
  options: SandboxOptions,
): Promise<void> {
  const simulator = createSimulator(options.providers);
  const keys = keysRepository(options.db);
  const events = eventsRepository(options.db);
  const service = createSandboxService({
    keys,
    events,
    simulator,
    resolveHost: options.resolveHost ?? systemResolver,
    serverSecret: options.serverSecret,
    now: options.now,
  });
  const gateway = createGateway({
    db: options.db,
    keys,
    events,
    simulator,
    counters: options.counters,
    webOrigin: options.webOrigin,
    now: options.now,
  });
  const relays = relayRepository(options.db);
  const hub = createRelayHub(options.bus ?? memoryBus(), relays);
  const relayDeps = { keys, relays, hub, resolve: options.resolveAccount, now: options.now };
  await app.register((scope) => {
    registerSandboxRoutes(scope, service, options.resolveAccount);
    registerRelayRoutes(scope, relayDeps);
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
