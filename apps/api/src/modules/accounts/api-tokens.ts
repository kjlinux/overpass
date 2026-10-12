import { createHash, randomBytes } from "node:crypto";

const tokenPattern = /^ovp_[\w-]{43}$/;

/** A personal token: recognisable prefix and 256 random bits. */
export function generateApiToken(): string {
  return `ovp_${randomBytes(32).toString("base64url")}`;
}

/** 256 random bits make a fast hash safe; Argon2 is for low-entropy passwords. */
export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function looksLikeApiToken(value: string): boolean {
  return tokenPattern.test(value);
}
