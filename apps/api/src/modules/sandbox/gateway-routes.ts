import type { HttpMethod } from "@overpass/simulator";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "../../http/app-error.js";
import type { Gateway } from "./gateway.js";

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const bodyLimit = 262_144;

/** Developers call these from their own servers, at a steady but bounded pace per address. */
const perAddress = { max: 300, timeWindow: 60_000 };

function flatten(headers: FastifyRequest["headers"]): Record<string, string> {
  const entries = Object.entries(headers).flatMap(([name, value]) => {
    if (value === undefined) return [];
    return [[name, Array.isArray(value) ? value.join(", ") : value]];
  });
  return Object.fromEntries(entries) as Record<string, string>;
}

function flattenQuery(query: unknown): Record<string, string> {
  const entries = Object.entries((query ?? {}) as Record<string, unknown>);
  return Object.fromEntries(entries.map(([name, value]) => [name, String(value)]));
}

/** Answers in each provider's own format: these replies skip the Overpass envelope. */
export function registerGatewayRoutes(app: FastifyInstance, gateway: Gateway): void {
  app.removeAllContentTypeParsers();
  app.addContentTypeParser("*", { parseAs: "string", bodyLimit }, (_request, body, done) => {
    done(null, body);
  });
  app.route({
    method: methods,
    url: "/v1/sandbox/:provider/*",
    config: { rateLimit: perAddress },
    handler: async (request, reply) => {
      const params = request.params as { provider: string; "*": string };
      const answer = await gateway.handle({
        provider: params.provider,
        method: request.method as HttpMethod,
        path: `/${params["*"]}`,
        query: flattenQuery(request.query),
        headers: flatten(request.headers),
        rawBody: typeof request.body === "string" ? request.body : "",
      });
      if (answer === undefined) throw new AppError("not_found", 404);
      return reply
        .code(answer.status)
        .headers(answer.headers ?? {})
        .send(answer.body ?? "");
    },
  });
}
