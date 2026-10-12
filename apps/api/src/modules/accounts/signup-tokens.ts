import { hkdfSync } from "node:crypto";
import type { Language } from "@overpass/shared";
import { EncryptJWT, jwtDecrypt } from "jose";

/** A sign-up waiting for its e-mail confirmation; nothing is stored until then. */
export type PendingSignUp = {
  email: string;
  passwordHash: string;
  country: string;
  language: Language;
};

const audience = "signup";
const lifetime = "24h";

function isPending(
  value: Record<string, unknown>,
): value is PendingSignUp & Record<string, unknown> {
  return ["email", "passwordHash", "country", "language"].every(
    (key) => typeof value[key] === "string",
  );
}

/** Encrypted (not only signed) tokens, so the link never exposes the password hash. */
export function signupTokens(secret: string) {
  const key = new Uint8Array(hkdfSync("sha256", secret, "overpass", "signup-token", 32));
  return {
    seal: (pending: PendingSignUp) =>
      new EncryptJWT({ ...pending })
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime(lifetime)
        .encrypt(key),
    open: async (token: string): Promise<PendingSignUp | null> => {
      try {
        const { payload } = await jwtDecrypt(token, key, { audience });
        if (!isPending(payload)) return null;
        const { email, passwordHash, country, language } = payload;
        return { email, passwordHash, country, language };
      } catch {
        return null;
      }
    },
  };
}
