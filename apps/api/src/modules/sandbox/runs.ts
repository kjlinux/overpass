import type { SandboxEvent } from "@overpass/shared";
import type { Scenario, Simulator } from "@overpass/simulator";
import { AppError } from "../../http/app-error.js";
import type { Account } from "../accounts/index.js";
import type { Gateway, GatewayCall } from "./gateway.js";
import { digestKey, generateKey, visiblePrefix } from "./keys.js";
import { toEvent } from "./outputs.js";
import type { EventLookup, KeyRow, KeysRepository } from "./repository.js";

export type RunDeps = {
  keys: KeysRepository;
  lookup: EventLookup;
  gateway: Gateway;
  simulator: Simulator;
  demoProvider: string;
  now: () => Date;
};

const demoLifetimeMs = 3_600_000;
const demoQuota = 5;

function exampleCall(simulator: Simulator, provider: string, scenario?: Scenario): GatewayCall {
  const example = simulator.example(provider);
  if (example === undefined) throw new AppError("not_found", 404);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (scenario !== undefined) headers["overpass-scenario"] = scenario;
  const rawBody = example.body === undefined ? "" : JSON.stringify(example.body);
  return { provider, method: example.method, path: example.path, query: {}, headers, rawBody };
}

/** An ownerless key that lives one hour, sends to the built-in receiver, and is purged later. */
function insertDemoKey(deps: RunDeps, scenario: Scenario): Promise<KeyRow> {
  const now = deps.now();
  const secret = generateKey();
  return deps.keys.insert({
    userId: null,
    provider: deps.demoProvider,
    keyHash: digestKey(secret),
    prefix: visiblePrefix(secret),
    scenario,
    target: "inbox",
    webhookUrl: null,
    quota: demoQuota,
    expiresAt: new Date(now.getTime() + demoLifetimeMs),
    createdAt: now,
  });
}

/** Calls Overpass plays itself: the trial page's launch button and the public demo. */
export function createRunService(deps: RunDeps) {
  async function play(key: KeyRow, scenario?: Scenario): Promise<SandboxEvent> {
    const result = await deps.gateway.runAs(
      key,
      exampleCall(deps.simulator, key.provider, scenario),
    );
    const found = result.eventId === undefined ? undefined : await deps.lookup.byId(result.eventId);
    if (found === undefined) throw new AppError("rate_limited", 429);
    return toEvent(found.event, found.deliveries);
  }

  return {
    async runKey(account: Account, id: string, scenario?: Scenario): Promise<SandboxEvent> {
      const key = await deps.keys.findOwned(account.id, id, deps.now());
      if (key === undefined) throw new AppError("not_found", 404);
      return play(key, scenario);
    },
    async startDemo(scenario: Scenario): Promise<SandboxEvent> {
      if (!deps.simulator.has(deps.demoProvider)) throw new AppError("not_found", 404);
      return play(await insertDemoKey(deps, scenario), scenario);
    },
    async demoEvent(id: string): Promise<SandboxEvent> {
      const found = await deps.lookup.demoById(id);
      if (found === undefined) throw new AppError("not_found", 404);
      return toEvent(found.event, found.deliveries);
    },
  };
}

export type RunService = ReturnType<typeof createRunService>;
