import { createHmac } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { UserRecord } from "./model.js";

export const sessionMaxAgeSeconds = 7 * 24 * 60 * 60;
const resetMaxAgeSeconds = 30 * 60;
const issuer = "overpass";

export type SignedTokens = ReturnType<typeof signedTokens>;

/** Stateless session and reset tokens, kept apart by their audience. */
export function signedTokens(secret: string) {
  const key = new TextEncoder().encode(secret);
  const fingerprint = (passwordHash: string) =>
    createHmac("sha256", secret).update(passwordHash).digest("base64url").slice(0, 22);

  const sign = (claims: Record<string, unknown>, subject: string, audience: string, ttl: number) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(subject)
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(`${String(ttl)}s`)
      .sign(key);

  const read = async (token: string, audience: string) => {
    try {
      const { payload } = await jwtVerify(token, key, { issuer, audience, algorithms: ["HS256"] });
      return payload;
    } catch {
      return null;
    }
  };

  return {
    fingerprint,
    signSession: (user: UserRecord) =>
      sign({ sv: user.sessionVersion }, user.id, "session", sessionMaxAgeSeconds),
    signReset: (user: UserRecord) =>
      sign({ fp: fingerprint(user.passwordHash) }, user.id, "reset", resetMaxAgeSeconds),
    verifySession: async (token: string) => {
      const payload = await read(token, "session");
      if (typeof payload?.sub !== "string" || typeof payload["sv"] !== "number") return null;
      return { userId: payload.sub, version: payload["sv"] };
    },
    verifyReset: async (token: string) => {
      const payload = await read(token, "reset");
      if (typeof payload?.sub !== "string" || typeof payload["fp"] !== "string") return null;
      return { userId: payload.sub, fingerprint: payload["fp"] };
    },
  };
}
