import type { ProviderAdapter } from "@overpass/simulator";
import type { FastifyRequest } from "fastify";

const tokenPaths = ["/v1/newsletter/"];

/** Newsletter links carry a permanent token in the query; logs keep the path only. */
export function loggedUrl(url: string): string {
  const query = url.indexOf("?");
  if (query === -1 || !tokenPaths.some((path) => url.startsWith(path))) return url;
  return url.slice(0, query);
}

/** Fastify's default request fields, with the URL passed through loggedUrl. */
export function requestSerializer(request: FastifyRequest) {
  return {
    method: request.method,
    url: loggedUrl(request.url),
    host: request.host,
    remoteAddress: request.ip,
    ...(request.socket.remotePort === undefined ? {} : { remotePort: request.socket.remotePort }),
  };
}

const alwaysRedacted = [
  "req.headers.cookie",
  "req.headers.authorization",
  'req.headers["x-api-key"]',
];

/** Pino redact paths; each operator lists its own secret headers, so a new one needs no edit here. */
export function redactedHeaders(operators: readonly Pick<ProviderAdapter, "secretHeaders">[]) {
  const secret = operators.flatMap((operator) => operator.secretHeaders ?? []);
  return [...alwaysRedacted, ...secret.map((name) => `req.headers[${JSON.stringify(name)}]`)];
}
