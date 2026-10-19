import type {
  DeliveryStatus,
  Language,
  SandboxDelivery,
  SandboxEvent,
  SandboxKey,
  SandboxProvider,
  SandboxTarget,
} from "@overpass/shared";
import type { AuthDoc, ExampleStep, ProviderIdentity, Scenario } from "@overpass/simulator";
import type { DeliveryRow, EventRow, KeyRow } from "./repository.js";

type StoredRequest = SandboxEvent["request"];
type StoredResponse = SandboxEvent["response"];

export function toKey(row: KeyRow, webhookSecret: string): SandboxKey {
  return {
    id: row.id,
    provider: row.provider,
    scenario: row.scenario as Scenario,
    target: row.target as SandboxTarget,
    webhookUrl: row.webhookUrl,
    prefix: row.prefix,
    quota: row.quota,
    webhookSecret,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toDelivery(row: DeliveryRow): SandboxDelivery {
  return {
    id: row.id,
    eventType: row.eventType,
    target: row.target as SandboxTarget,
    status: row.status as DeliveryStatus,
    attempts: row.attempts,
    body: row.body,
    headers: row.headers as Record<string, string>,
    responseStatus: row.responseStatus,
    durationMs: row.durationMs,
    dueAt: row.dueAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
  };
}

export function toEvent(row: EventRow, deliveries: DeliveryRow[]): SandboxEvent {
  return {
    id: row.id,
    cursor: row.seq,
    provider: row.provider,
    scenario: row.scenario as Scenario,
    request: row.request as StoredRequest,
    response: row.response as StoredResponse,
    deliveries: deliveries.filter((delivery) => delivery.eventId === row.id).map(toDelivery),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Falls back to English, then to any language the provider folder ships. */
export function toProvider(
  identity: ProviderIdentity,
  language: Language,
  steps: readonly ExampleStep[] = [],
  auth: AuthDoc = { type: "bearer" },
): SandboxProvider {
  const copy = identity.copy[language] ?? identity.copy.en ?? Object.values(identity.copy)[0];
  return {
    id: identity.id,
    name: identity.name,
    countries: [...identity.countries],
    docsUrl: identity.docsUrl,
    docsVersion: identity.docsVersion,
    consultedAt: identity.consultedAt,
    officialSandboxUrl: identity.officialSandboxUrl ?? null,
    warning: copy?.warning ?? null,
    auth,
    steps: steps.map((step) => ({
      id: step.id,
      method: step.method,
      path: step.path,
      launch: step.launch === true,
      summary: copy?.steps?.[step.id] ?? null,
      headers: { ...step.headers },
      body: step.body ?? null,
    })),
    unofficial: true,
    summary: copy?.summary ?? identity.name,
    notes: [...(copy?.notes ?? [])],
  };
}
