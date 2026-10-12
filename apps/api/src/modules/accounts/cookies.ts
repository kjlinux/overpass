import type { FastifyReply, FastifyRequest } from "fastify";
import { sessionMaxAgeSeconds } from "./signed-tokens.js";

export type SessionCookies = ReturnType<typeof sessionCookies>;

/** The session lives in one httpOnly cookie; __Host- pins it to our origin over HTTPS. */
export function sessionCookies(secure: boolean) {
  const name = secure ? "__Host-overpass_session" : "overpass_session";
  const options = { httpOnly: true, sameSite: "lax", secure, path: "/" } as const;
  return {
    read: (request: FastifyRequest): string | undefined => request.cookies[name],
    set: (reply: FastifyReply, token: string) =>
      reply.setCookie(name, token, { ...options, maxAge: sessionMaxAgeSeconds }),
    clear: (reply: FastifyReply) => reply.clearCookie(name, options),
  };
}
