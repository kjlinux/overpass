import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const tokenBytes = 32;
const purpose = "newsletter-unsubscribe";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Confirmation links carry this value; only its hash is stored. */
export const newToken = (): string => randomBytes(tokenBytes).toString("base64url");

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const sign = (secret: string, id: string): string =>
  createHmac("sha256", secret).update(`${purpose}:${id}`).digest("base64url");

/** Stateless and permanent, so every past issue keeps a working link. */
export const unsubscribeToken = (secret: string, id: string): string => `${id}.${sign(secret, id)}`;

export function subscriberOfToken(secret: string, token: string): string | null {
  const [id, signature, extra] = token.split(".");
  if (id === undefined || signature === undefined || extra !== undefined) return null;
  if (!uuidPattern.test(id)) return null;
  const expected = Buffer.from(sign(secret, id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
