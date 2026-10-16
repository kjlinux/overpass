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
