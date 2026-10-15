import { createHash } from "node:crypto";

/** The documented hash: SHA-512 of the merchant's MasterKey, in hex. */
export const masterKeyHash = (masterKey: string) =>
  createHash("sha512").update(masterKey).digest("hex");

function flatten(prefix: string, value: unknown): [string, string][] {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([name, item]) => flatten(`${prefix}[${name}]`, item));
  }
  const scalar = value as string | number | boolean | bigint | null | undefined;
  return [[prefix, scalar === null || scalar === undefined ? "" : String(scalar)]];
}

/** The IPN body: form fields under data, nested with brackets as the PHP example reads them. */
export function ipnForm(data: Record<string, unknown>): string {
  return new URLSearchParams(flatten("data", data)).toString();
}
