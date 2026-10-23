import type { FastifyInstance } from "fastify";

/** JSON answers never run as a page, so they may load nothing at all. */
export const apiContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";

// The one hash is the inline theme script of apps/web/index.html; a test keeps them in step.
const themeScript = "'sha256-7FPCoee6Uje0y9WLrI7dZetAZX+TqftNIwp5o8EV+b0='";

/** Policy of every web page, sent by the proxy and by the API share pages alike. */
export const webContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' ${themeScript}`,
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const headers = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

/** Hardening headers on every answer; HSTS belongs to the TLS proxy in front of the API. */
export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook("onSend", async (_request, reply) => {
    reply.headers(headers);
    if (!reply.hasHeader("content-security-policy")) {
      reply.header("content-security-policy", apiContentSecurityPolicy);
    }
  });
}
