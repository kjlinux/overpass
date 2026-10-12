import { hash, verify } from "@node-rs/argon2";

let timingHash: Promise<string> | undefined;

/** Hashes with Argon2id and the library defaults (OWASP minimum: 19 MiB, 2 passes). */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/** Verifies a password; an unknown account still pays for one Argon2 run. */
export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  timingHash ??= hashPassword("timing-equaliser-password");
  const target = stored ?? (await timingHash);
  const matches = await verify(target, password).catch(() => false);
  return stored !== null && matches;
}
