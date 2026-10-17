import type { InferSelectModel } from "drizzle-orm";
import type { sandboxEvents, sandboxKeys } from "./tables.js";

export type SandboxKeyRecord = InferSelectModel<typeof sandboxKeys>;
export type SandboxEventRecord = InferSelectModel<typeof sandboxEvents>;

export type CreateKeyParams = {
  readonly userId?: string | null | undefined;
  readonly providerId: string;
  readonly keyHash: string;
  readonly expiresAt: Date;
  readonly quota: number;
};

export type RecordEventParams = {
  readonly keyId: string;
  readonly scenario: string;
  readonly requestMethod: string;
  readonly requestPath: string;
  readonly requestHeaders: Record<string, string>;
  readonly requestBody?: unknown;
  readonly responseStatus: number;
  readonly responseHeaders: Record<string, string>;
  readonly responseBody?: unknown;
  readonly webhooks: readonly unknown[];
};

export interface SandboxRepository {
  createKey(params: CreateKeyParams): Promise<SandboxKeyRecord>;
  findActiveKeyByHash(keyHash: string, now: Date): Promise<SandboxKeyRecord | null>;
  decrementQuota(keyId: string): Promise<boolean>;
  recordEvent(params: RecordEventParams): Promise<SandboxEventRecord>;
  listEventsByKey(keyId: string, limit: number): Promise<readonly SandboxEventRecord[]>;
  purgeOldEvents(olderThan: Date): Promise<number>;
}
