import { createHmac } from "node:crypto";

/** Wave sends one line with ", " and ": " separators; signatures cover these exact bytes. */
export function waveJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(waveJson).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    const fields = Object.entries(value).map(
      ([key, item]) => `${JSON.stringify(key)}: ${waveJson(item)}`,
    );
    return `{${fields.join(", ")}}`;
  }
  return JSON.stringify(value);
}

/** Wave-Signature: t={unix seconds},v1={hex HMAC-SHA256 of timestamp + body}. */
export function signWave(secret: string, timestamp: number, body: string): string {
  const stamp = timestamp.toString();
  const digest = createHmac("sha256", secret)
    .update(stamp + body)
    .digest("hex");
  return `t=${stamp},v1=${digest}`;
}
