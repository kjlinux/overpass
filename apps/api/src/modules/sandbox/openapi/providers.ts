import type { Language } from "@overpass/shared";
import { scenarios } from "@overpass/simulator";
import type { Endpoint, ProviderAdapter, ProviderCopy } from "@overpass/simulator";
import type { OpenApiText } from "./text.js";
import { jsonBody, jsonSchema, queryParameters, responses } from "./schema.js";
import type { JsonObject } from "./schema.js";

const openApiPath = (provider: string, path: string) =>
  `/v1/sandbox/${provider}${path.replace(/:(\w+)/g, "{$1}")}`;

const copyOf = (adapter: ProviderAdapter, language: Language): ProviderCopy | undefined =>
  adapter.identity.copy[language] ?? adapter.identity.copy.en;

function parameters(endpoint: Endpoint<unknown>, text: OpenApiText): JsonObject[] {
  const path = [...endpoint.path.matchAll(/:(\w+)/g)].map(([, name]) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
  const scenario = {
    name: "Overpass-Scenario",
    in: "header",
    required: false,
    description: text.scenarioHeader,
    schema: { type: "string", enum: [...scenarios] },
  };
  return [...path, ...queryParameters(endpoint.docs?.query), scenario];
}

function operation(
  adapter: ProviderAdapter,
  endpoint: Endpoint<unknown>,
  language: Language,
  text: OpenApiText,
) {
  const id = adapter.identity.id;
  const docs = endpoint.docs;
  return {
    summary:
      copyOf(adapter, language)?.endpoints?.[`${endpoint.method} ${endpoint.path}`] ??
      endpoint.path,
    tags: [adapter.identity.name],
    security: [{ [id]: [] }],
    parameters: parameters(endpoint, text),
    ...(docs?.body === undefined
      ? {}
      : { requestBody: { required: true, ...jsonBody(docs.body, "input") } }),
    responses: responses(docs?.responses ?? { 200: null }),
  };
}

export function providerPaths(
  adapters: readonly ProviderAdapter[],
  language: Language,
  text: OpenApiText,
) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const adapter of adapters) {
    for (const endpoint of adapter.endpoints) {
      const path = openApiPath(adapter.identity.id, endpoint.path);
      paths[path] = {
        ...paths[path],
        [endpoint.method.toLowerCase()]: operation(adapter, endpoint, language, text),
      };
    }
  }
  return paths;
}

/** OpenAPI 3.1 "webhooks": what each provider posts to the developer, with its signature header. */
export function providerWebhooks(adapters: readonly ProviderAdapter[], text: OpenApiText) {
  return Object.fromEntries(
    adapters.flatMap((adapter) =>
      Object.entries(adapter.webhooks.events ?? {}).map(([type, schema]) => {
        const header = adapter.webhooks.signatureHeader;
        const signature =
          header === undefined
            ? []
            : [{ name: header, in: "header", required: true, schema: { type: "string" } }];
        const post = {
          summary: text.webhook,
          tags: [adapter.identity.name],
          parameters: signature,
          requestBody: {
            required: true,
            content: { "application/json": { schema: jsonSchema(schema, "output") } },
          },
          responses: responses({ 200: null }),
        };
        return [`${adapter.identity.id}.${type}`, { post }];
      }),
    ),
  );
}

export function securitySchemes(
  adapters: readonly ProviderAdapter[],
  text: OpenApiText,
): JsonObject {
  return Object.fromEntries(
    adapters.map((adapter) => {
      const auth = adapter.auth ?? { type: "bearer" as const };
      const scheme =
        auth.type === "bearer"
          ? { type: "http", scheme: "bearer", description: text.keyScheme }
          : { type: "apiKey", in: "header", name: auth.name, description: text.keyScheme };
      return [adapter.identity.id, scheme];
    }),
  );
}
