import { pickLanguage } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import type { ProviderAdapter } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import { buildSandboxOpenApi } from "./build.js";

/** Public reference of the simulator; built once per language, the providers never change at runtime. */
export function registerOpenApiRoute(
  app: FastifyInstance,
  adapters: readonly ProviderAdapter[],
): void {
  const documents = new Map<Language, unknown>();
  app.get("/v1/sandbox/openapi.json", (request, reply) => {
    const language = pickLanguage(request.headers["accept-language"]);
    const document = documents.get(language) ?? buildSandboxOpenApi(adapters, language);
    documents.set(language, document);
    return reply.header("cache-control", "public, max-age=3600").send(document);
  });
}
