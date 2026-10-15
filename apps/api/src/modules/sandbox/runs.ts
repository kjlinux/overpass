import { randomBytes } from "node:crypto";
import type { SandboxEvent } from "@overpass/shared";
import { captureVars, fillStep, launchSteps } from "@overpass/simulator";
import type { ExampleStep, Scenario, Simulator, StepVars } from "@overpass/simulator";
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

export type RunInput = {
  scenario?: Scenario | undefined;
  step?: string | undefined;
  vars?: StepVars | undefined;
};
export type RunResult = { event: SandboxEvent; vars: Record<string, string> };

const demoLifetimeMs = 3_600_000;
const demoQuota = 5;

function callOf(
  provider: string,
  step: ExampleStep,
  vars: StepVars,
  scenario?: Scenario,
): GatewayCall {
  const filled = fillStep(step, vars);
  const headers =
    scenario === undefined ? filled.headers : { ...filled.headers, "overpass-scenario": scenario };
  return {
    provider,
    method: filled.method,
    path: filled.path,
    query: {},
    headers,
    rawBody: filled.rawBody,
  };
}

/** The named step, or every launch step; an unknown step is a missing resource. */
function stepsFor(simulator: Simulator, provider: string, step: string | undefined): ExampleStep[] {
  const all = simulator.steps(provider);
  const chosen =
    step === undefined ? launchSteps(all) : all.filter((candidate) => candidate.id === step);
  if (chosen.length === 0) throw new AppError("not_found", 404);
  return chosen;
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

/** Plays steps in order, each one reading what the previous ones captured; returns the last call. */
async function play(deps: RunDeps, key: KeyRow, input: RunInput): Promise<RunResult> {
  let vars: Record<string, string> = { fresh: randomBytes(6).toString("hex"), ...input.vars };
  let eventId: string | undefined;
  for (const step of stepsFor(deps.simulator, key.provider, input.step)) {
    const result = await deps.gateway.runAs(key, callOf(key.provider, step, vars, input.scenario));
    eventId = result.eventId;
    if (eventId === undefined) throw new AppError("rate_limited", 429);
    vars = { ...vars, ...captureVars(step, result.response.body) };
  }
  const found = eventId === undefined ? undefined : await deps.lookup.byId(eventId);
  if (found === undefined) throw new AppError("not_found", 404);
  return { event: toEvent(found.event, found.deliveries), vars };
}

/** Calls Overpass plays itself: the launch button, the guided walkthrough and the public demo. */
export function createRunService(deps: RunDeps) {
  return {
    async runKey(account: Account, id: string, input: RunInput): Promise<RunResult> {
      const key = await deps.keys.findOwned(account.id, id, deps.now());
      if (key === undefined) throw new AppError("not_found", 404);
      return play(deps, key, input);
    },
    async startDemo(scenario: Scenario): Promise<SandboxEvent> {
      if (!deps.simulator.has(deps.demoProvider)) throw new AppError("not_found", 404);
      return (await play(deps, await insertDemoKey(deps, scenario), { scenario })).event;
    },
    async demoEvent(id: string): Promise<SandboxEvent> {
      const found = await deps.lookup.demoById(id);
      if (found === undefined) throw new AppError("not_found", 404);
      return toEvent(found.event, found.deliveries);
    },
  };
}

export type RunService = ReturnType<typeof createRunService>;
