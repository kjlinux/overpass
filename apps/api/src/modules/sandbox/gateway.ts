import { randomBytes } from "node:crypto";
import { scenarios } from "@overpass/simulator";
import type {
  HttpMethod,
  Scenario,
  ScheduledWebhook,
  SimRequest,
  SimResponse,
  Simulator,
} from "@overpass/simulator";
import type { Database } from "../../db/client.js";
import type { CounterStore } from "../../limits/index.js";
import { digestKey, looksLikeKey } from "./keys.js";
import { objectStore } from "./repository.js";
import type { DeliveryInsert, EventsRepository, KeyRow, KeysRepository } from "./repository.js";

export type GatewayCall = {
  provider: string;
  method: HttpMethod;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  rawBody: string;
};

export type GatewayDeps = {
  db: Database;
  keys: KeysRepository;
  events: EventsRepository;
  simulator: Simulator;
  counters: CounterStore;
  now: () => Date;
};

const quotaWindowMs = 86_400_000;
const storedBodyLimit = 65_536;
const secretHeaders = new Set(["authorization", "x-api-key", "cookie", "proxy-authorization"]);

/** Bodies are kept raw for the inspector and parsed leniently for the provider. */
export function parseBody(raw: string, contentType: string | undefined): unknown {
  if (raw === "") return undefined;
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function redact(headers: Record<string, string>, credential: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      secretHeaders.has(name) || (credential !== "" && value.includes(credential))
        ? "[redacted]"
        : value,
    ]),
  );
}

function pickScenario(header: string | undefined, fallback: string): Scenario {
  const wanted = scenarios.find((scenario) => scenario === header);
  return wanted ?? (fallback as Scenario);
}

function deliveriesFor(key: KeyRow, webhooks: ScheduledWebhook[], now: Date): DeliveryInsert[] {
  return webhooks.map((webhook) => ({
    keyId: key.id,
    provider: key.provider,
    event: webhook.event,
    eventType: webhook.event.type,
    target: key.target,
    webhookUrl: key.webhookUrl,
    dueAt: new Date(now.getTime() + webhook.delayMs),
  }));
}

async function authenticate(
  deps: GatewayDeps,
  call: GatewayCall,
  request: SimRequest,
): Promise<KeyRow | undefined> {
  const credential = deps.simulator.credential(call.provider, request);
  if (credential === undefined || !looksLikeKey(credential)) return undefined;
  const key = await deps.keys.findActiveByHash(digestKey(credential), deps.now());
  return key?.provider === call.provider ? key : undefined;
}

function storedRequest(call: GatewayCall, credential: string) {
  return {
    method: call.method,
    path: call.path,
    headers: redact(call.headers, credential),
    body: call.rawBody.slice(0, storedBodyLimit),
  };
}

async function simulate(
  deps: GatewayDeps,
  call: GatewayCall,
  request: SimRequest,
  key: KeyRow,
): Promise<SimResponse> {
  const now = deps.now();
  const scenario = pickScenario(call.headers["overpass-scenario"], key.scenario);
  const store = objectStore(deps.db, key.id, key.provider);
  const newId = () => randomBytes(10).toString("hex");
  const context = { scenario, store, now, newId };
  const result = await deps.simulator.handle(call.provider, request, context);
  if (result === undefined) return deps.simulator.refusal(call.provider, "notFound");
  const credential = deps.simulator.credential(call.provider, request) ?? "";
  const response = { status: result.response.status, body: result.response.body ?? null };
  await deps.events.record(
    {
      keyId: key.id,
      provider: key.provider,
      scenario,
      createdAt: now,
      request: storedRequest(call, credential),
      response,
    },
    deliveriesFor(key, result.webhooks, now),
  );
  return result.response;
}

/** Authenticates, meters, simulates and records one call to a simulated provider. */
export function createGateway(deps: GatewayDeps) {
  const { simulator } = deps;
  return async function handle(call: GatewayCall): Promise<SimResponse | undefined> {
    if (!simulator.has(call.provider)) return undefined;
    const body = parseBody(call.rawBody, call.headers["content-type"]);
    const request: SimRequest = { ...call, body };
    const key = await authenticate(deps, call, request);
    if (key === undefined) return simulator.refusal(call.provider, "unauthorized");
    const usage = await deps.counters.hit(`sandbox:key:${key.id}`, quotaWindowMs);
    if (usage.count > key.quota) return simulator.refusal(call.provider, "tooManyRequests");
    return simulate(deps, call, request, key);
  };
}

export type Gateway = ReturnType<typeof createGateway>;
