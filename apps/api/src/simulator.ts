import type { ProviderAdapter } from "@overpass/simulator";
import { providers } from "@overpass/providers";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "./app.js";
import type { Database } from "./db/client.js";
import type { postgresCounters } from "./limits/index.js";
import type { AccountResolver } from "./modules/accounts/index.js";
import { memoryBus, postgresBus, registerSandbox } from "./modules/sandbox/index.js";
import type { HostResolver, RelayBus } from "./modules/sandbox/index.js";

/** Tests swap the simulated providers and the DNS resolver; production uses the real ones. */
export type SandboxDeps = {
  providers?: readonly ProviderAdapter[];
  resolveHost?: HostResolver;
  bus?: RelayBus;
  demoProvider?: string;
};

/** Instances share relay announcements through PostgreSQL; without a URL, one process is enough. */
function relayBus(
  app: FastifyInstance,
  config: AppConfig,
  injected: RelayBus | undefined,
): RelayBus {
  if (injected !== undefined) return injected;
  const bus =
    config.DATABASE_URL === undefined ? memoryBus() : postgresBus(config.DATABASE_URL, app.log);
  app.addHook("onClose", () => bus.close());
  return bus;
}

/** The sandbox shares the rate limit counters and announces relays across instances. */
export async function registerSimulator(
  app: FastifyInstance,
  deps: {
    config: AppConfig;
    sandbox: SandboxDeps | undefined;
    db: Database;
    counters: ReturnType<typeof postgresCounters>;
    resolveAccount: AccountResolver;
    now: () => Date;
  },
): Promise<void> {
  const { config, db, counters, sandbox, resolveAccount, now } = deps;
  await registerSandbox(app, {
    db,
    counters,
    providers: sandbox?.providers ?? providers,
    resolveAccount,
    serverSecret: config.SESSION_SECRET,
    webOrigin: config.WEB_ORIGIN,
    now,
    bus: relayBus(app, config, sandbox?.bus),
    ...(sandbox?.demoProvider === undefined ? {} : { demoProvider: sandbox.demoProvider }),
    ...(sandbox?.resolveHost === undefined ? {} : { resolveHost: sandbox.resolveHost }),
  });
}
