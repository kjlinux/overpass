import { createHash, randomBytes } from "node:crypto";
import type { SimulationOutcome, SimulatorRegistry } from "@overpass/simulator";
import type { SandboxEventOutput, SandboxKeyOutput, SandboxSimulationInput } from "./schemas.js";
import { AppError } from "../../http/app-error.js";
import type { SandboxKeyRecord, SandboxRepository } from "./model.js";
import { isPrivateOrLocalHost } from "./ssrf.js";

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

async function resolveKey(repository: SandboxRepository, rawKey: string) {
  const record = await repository.findActiveKeyByHash(hashKey(rawKey), new Date());
  if (record === null) throw new AppError("sandbox_key_invalid", 401);
  if (record.quotaRemaining <= 0) throw new AppError("sandbox_quota_exhausted", 429);
  return record;
}

function buildCreateKey(repository: SandboxRepository) {
  return async (params: {
    userId?: string | null | undefined;
    provider: string;
    expiresHours?: number | undefined;
  }): Promise<SandboxKeyOutput> => {
    const rawKey = "sbk_" + randomBytes(32).toString("hex");
    const hours = params.expiresHours ?? 24;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
    const record = await repository.createKey({
      userId: params.userId,
      providerId: params.provider,
      keyHash: hashKey(rawKey),
      expiresAt,
      quota: 100,
    });
    return {
      id: record.id,
      key: rawKey,
      provider: record.providerId,
      quotaRemaining: record.quotaRemaining,
      expiresAt: record.expiresAt.toISOString(),
    };
  };
}

async function saveSimulationEvent(
  repository: SandboxRepository,
  keyId: string,
  input: SandboxSimulationInput,
  outcome: SimulationOutcome,
) {
  const saved = await repository.recordEvent({
    keyId,
    scenario: input.scenario,
    requestMethod: input.method,
    requestPath: input.path,
    requestHeaders: input.headers ?? {},
    requestBody: input.body,
    responseStatus: outcome.response.status,
    responseHeaders: outcome.response.headers,
    responseBody: outcome.response.body,
    webhooks: outcome.webhooks,
  });
  return saved.id;
}

function buildSimulate(repository: SandboxRepository, registry: SimulatorRegistry) {
  return async (params: {
    rawKey?: string | undefined;
    providerId: string;
    input: SandboxSimulationInput;
  }) => {
    const provider = registry.get(params.providerId);
    if (provider === undefined) throw new AppError("provider_not_found", 404);
    if (params.input.webhookUrl && isPrivateOrLocalHost(params.input.webhookUrl)) {
      throw new AppError("sandbox_ssrf_blocked", 400);
    }

    let keyRecord: SandboxKeyRecord | null = null;
    if (params.rawKey !== undefined) {
      keyRecord = await resolveKey(repository, params.rawKey);
      await repository.decrementQuota(keyRecord.id);
    }

    const outcome = await provider.simulate({
      scenario: params.input.scenario,
      method: params.input.method,
      path: params.input.path,
      headers: params.input.headers,
      body: params.input.body,
      webhookUrl: params.input.webhookUrl,
      secret: params.input.secret,
    });

    const eventId =
      keyRecord !== null
        ? await saveSimulationEvent(repository, keyRecord.id, params.input, outcome)
        : undefined;
    return { eventId, outcome };
  };
}

function buildListEvents(repository: SandboxRepository) {
  return async (rawKey: string, limit = 20): Promise<readonly SandboxEventOutput[]> => {
    const keyRecord = await resolveKey(repository, rawKey);
    const events = await repository.listEventsByKey(keyRecord.id, limit);
    return events.map((e) => ({
      id: e.id,
      scenario: e.scenario as SandboxSimulationInput["scenario"],
      requestMethod: e.requestMethod,
      requestPath: e.requestPath,
      requestHeaders: e.requestHeaders,
      requestBody: e.requestBody,
      responseStatus: e.responseStatus,
      responseHeaders: e.responseHeaders,
      responseBody: e.responseBody,
      webhooks: e.webhooks as SandboxEventOutput["webhooks"],
      createdAt: e.createdAt.toISOString(),
    }));
  };
}

export function createSandboxService(repository: SandboxRepository, registry: SimulatorRegistry) {
  return {
    createKey: buildCreateKey(repository),
    simulate: buildSimulate(repository, registry),
    listEvents: buildListEvents(repository),
  };
}

export type SandboxService = ReturnType<typeof createSandboxService>;
