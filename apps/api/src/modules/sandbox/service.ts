import type {
  Language,
  SandboxEvent,
  SandboxKey,
  SandboxKeyCreateInput,
  SandboxKeyCreated,
  SandboxKeyUpdateInput,
  SandboxProvider,
} from "@overpass/shared";
import type { Simulator } from "@overpass/simulator";
import { AppError } from "../../http/app-error.js";
import type { Account } from "../accounts/index.js";
import {
  defaultQuota,
  digestKey,
  generateKey,
  keyLifetimeMs,
  maxActiveKeys,
  visiblePrefix,
  webhookSecret,
} from "./keys.js";
import { publicAddresses } from "./network/resolve.js";
import type { HostResolver } from "./network/resolve.js";
import { toEvent, toKey, toProvider } from "./outputs.js";
import type { EventsRepository, KeyRow, KeysRepository } from "./repository.js";

export type SandboxServiceDeps = {
  keys: KeysRepository;
  events: EventsRepository;
  simulator: Simulator;
  resolveHost: HostResolver;
  serverSecret: string;
  now: () => Date;
};

const invalid = (field: string, code: string) =>
  new AppError("validation_failed", 400, { [field]: code });

function keyTools(deps: SandboxServiceDeps) {
  return {
    output: (row: KeyRow): SandboxKey =>
      toKey(
        row,
        webhookSecret(deps.serverSecret, row.id, deps.simulator.secretPrefix(row.provider)),
      ),
    async assertPublicUrl(url: string | null | undefined): Promise<void> {
      if (url === undefined || url === null) return;
      const addresses = await publicAddresses(url, deps.resolveHost);
      if (addresses === undefined) throw invalid("webhookUrl", "webhook_url_private");
    },
    async owned(account: Account, id: string): Promise<KeyRow> {
      const row = await deps.keys.findOwned(account.id, id, deps.now());
      if (row === undefined) throw new AppError("not_found", 404);
      return row;
    },
  };
}

type Tools = ReturnType<typeof keyTools>;

function keyCreation(deps: SandboxServiceDeps, tools: Tools) {
  return async (account: Account, input: SandboxKeyCreateInput): Promise<SandboxKeyCreated> => {
    if (!deps.simulator.has(input.provider)) throw invalid("provider", "provider_not_simulated");
    await tools.assertPublicUrl(input.webhookUrl);
    const time = deps.now();
    if ((await deps.keys.countActive(account.id, time)) >= maxActiveKeys) {
      throw new AppError("sandbox_key_limit", 409);
    }
    const key = generateKey();
    const row = await deps.keys.insert({
      userId: account.id,
      provider: input.provider,
      keyHash: digestKey(key),
      prefix: visiblePrefix(key),
      scenario: input.scenario,
      target: input.target,
      webhookUrl: input.webhookUrl ?? null,
      quota: defaultQuota,
      expiresAt: new Date(time.getTime() + keyLifetimeMs),
      createdAt: time,
    });
    return { ...tools.output(row), key };
  };
}

function keyUpdate(deps: SandboxServiceDeps, tools: Tools) {
  return async (
    account: Account,
    id: string,
    patch: SandboxKeyUpdateInput,
  ): Promise<SandboxKey> => {
    const row = await tools.owned(account, id);
    await tools.assertPublicUrl(patch.webhookUrl);
    const target = patch.target ?? row.target;
    const webhookUrl = patch.webhookUrl === undefined ? row.webhookUrl : patch.webhookUrl;
    if (target === "url" && webhookUrl === null)
      throw invalid("webhookUrl", "webhook_url_required");
    const scenario = patch.scenario ?? row.scenario;
    const updated = await deps.keys.update(row.id, { scenario, target, webhookUrl });
    return tools.output(updated ?? row);
  };
}

/** Test key management and the inspector history; provider calls live in the gateway. */
export function createSandboxService(deps: SandboxServiceDeps) {
  const tools = keyTools(deps);
  return {
    providers: (language: Language): SandboxProvider[] =>
      deps.simulator
        .identities()
        .map((identity) => toProvider(identity, language, deps.simulator.example(identity.id))),
    createKey: keyCreation(deps, tools),
    listKeys: async (account: Account): Promise<SandboxKey[]> =>
      (await deps.keys.listActive(account.id, deps.now())).map(tools.output),
    updateKey: keyUpdate(deps, tools),
    async revokeKey(account: Account, id: string): Promise<void> {
      await deps.keys.revoke((await tools.owned(account, id)).id, deps.now());
    },
    async events(account: Account, keyId: string, before?: number): Promise<SandboxEvent[]> {
      const row = await tools.owned(account, keyId);
      const page = await deps.events.page(row.id, before);
      return page.events.map((event) => toEvent(event, page.deliveries));
    },
  };
}

export type SandboxService = ReturnType<typeof createSandboxService>;
