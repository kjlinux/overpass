import type { FastifyInstance } from "fastify";

const headers = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

/** Hardening headers on every answer; HSTS belongs to the TLS proxy in front of the API. */
export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook("onSend", async (_request, reply) => {
    reply.headers(headers);
  });
}
