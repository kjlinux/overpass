import { createHash, createHmac, randomBytes } from "node:crypto";

const keyPrefix = "ovp_test_";
const visibleLength = keyPrefix.length + 4;

export const keyLifetimeMs = 30 * 86_400_000;
export const maxActiveKeys = 5;
export const defaultQuota = 1000;

/** 24 random bytes give the 32 base64url characters after the prefix. */
export function generateKey(): string {
  return keyPrefix + randomBytes(24).toString("base64url");
}

export function digestKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function visiblePrefix(key: string): string {
  return key.slice(0, visibleLength);
}

export function looksLikeKey(value: string): boolean {
  return value.startsWith(keyPrefix) && value.length < 100;
}

/** Derived, never stored: the owner can see it again, a database leak alone cannot sign. */
export function webhookSecret(serverSecret: string, keyId: string, prefix = ""): string {
  const digest = createHmac("sha256", serverSecret)
    .update(`sandbox-webhook:${keyId}`)
    .digest("base64url");
  return prefix + digest.slice(0, 32);
}
