import { fileURLToPath } from "node:url";
import { relayResultInput, relayReadySchema, relayWebhookSchema } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import type { ProviderAdapter } from "@overpass/simulator";
import { providerPaths, providerWebhooks, securitySchemes } from "./providers.js";
import { jsonBody, jsonSchema, responses } from "./schema.js";
import { openApiText } from "./text.js";
import type { OpenApiText } from "./text.js";

const docsDirectory = new URL("../../../../../../docs/openapi/", import.meta.url);

export const openApiFile = (language: Language) =>
  fileURLToPath(new URL(`sandbox.${language}.json`, docsDirectory));

function relayPaths(text: OpenApiText) {
  const security = [{ overpass: [] }];
  const stream = {
    description: text.listenDescription,
    content: {
      "text/event-stream": {
        schema: {
          oneOf: [jsonSchema(relayReadySchema, "output"), jsonSchema(relayWebhookSchema, "output")],
        },
      },
    },
  };
  return {
    "/v1/sandbox/listen": {
      get: {
        summary: text.listen,
        description: text.listenDescription,
        tags: ["Overpass"],
        security,
        parameters: [
          { name: "Last-Event-ID", in: "header", required: false, schema: { type: "string" } },
        ],
        responses: { 200: stream, ...responses({ 401: null, 429: null }) },
      },
    },
    "/v1/sandbox/deliveries/{id}/result": {
      post: {
        summary: text.result,
        tags: ["Overpass"],
        security,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: { required: true, ...jsonBody(relayResultInput, "input") },
        responses: responses({ 200: null, 400: null, 401: null, 404: null }),
      },
    },
  };
}

function providersInfo(adapters: readonly ProviderAdapter[]) {
  return adapters.map(({ identity }) => ({
    id: identity.id,
    name: identity.name,
    unofficial: identity.unofficial,
    docsUrl: identity.docsUrl,
    docsVersion: identity.docsVersion,
    consultedAt: identity.consultedAt,
  }));
}

/** The only API external developers call: the simulated providers and the local relay. */
export function buildSandboxOpenApi(adapters: readonly ProviderAdapter[], language: Language) {
  const text = openApiText(language);
  return {
    openapi: "3.1.0",
    info: {
      title: text.title,
      version: "1",
      description: text.description,
      "x-providers": providersInfo(adapters),
    },
    paths: { ...providerPaths(adapters, language, text), ...relayPaths(text) },
    webhooks: providerWebhooks(adapters, text),
    components: {
      securitySchemes: {
        ...securitySchemes(adapters, text),
        overpass: { type: "http", scheme: "bearer", description: text.keyScheme },
      },
    },
  };
}
