import { readFile } from "node:fs/promises";
import { providers } from "@overpass/providers";
import { describe, expect, it } from "vitest";
import { createTestApp } from "../../../testing.js";
import { buildSandboxOpenApi, openApiFile } from "./build.js";

type Operation = {
  summary?: string;
  parameters?: { name: string; in: string; required?: boolean }[];
  requestBody?: { content: Record<string, { schema: { required?: string[] } }> };
  responses: Record<
    string,
    { content?: Record<string, { schema: { properties?: Record<string, unknown> } }> }
  >;
  security?: Record<string, unknown>[];
};
type Doc = {
  openapi: string;
  info: Record<string, unknown>;
  paths: Record<string, Record<string, Operation>>;
  webhooks: Record<string, { post: Operation & { parameters?: { name: string }[] } }>;
  components: { securitySchemes: Record<string, unknown> };
};

const english = buildSandboxOpenApi(providers, "en") as Doc;

describe("buildSandboxOpenApi", () => {
  it("describes an OpenAPI 3.1 document for the simulator only", () => {
    expect(english.openapi).toBe("3.1.0");
    expect(Object.keys(english.paths).every((path) => path.startsWith("/v1/sandbox/"))).toBe(true);
    expect(english.paths["/v1/sandbox/keys"]).toBeUndefined();
  });

  it("documents each provider endpoint from its schemas", () => {
    const create = english.paths["/v1/sandbox/wave/v1/checkout/sessions"]?.post;
    expect(create?.summary).toBeTruthy();
    expect(create?.requestBody?.content["application/json"]?.schema.required).toEqual([
      "amount",
      "currency",
      "error_url",
      "success_url",
    ]);
    expect(
      create?.responses["200"]?.content?.["application/json"]?.schema.properties,
    ).toHaveProperty("checkout_status");
    expect(create?.responses["400"]).toBeDefined();
    expect(create?.security).toEqual([{ wave: [] }]);
    expect(english.components.securitySchemes.wave).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });

  it("turns path and query parameters into OpenAPI parameters", () => {
    const read = english.paths["/v1/sandbox/wave/v1/checkout/sessions/{id}"]?.get;
    expect(read?.parameters).toEqual([
      expect.objectContaining({ name: "id", in: "path", required: true }),
    ]);
    const byTransaction = english.paths["/v1/sandbox/wave/v1/checkout/sessions"]?.get;
    expect(byTransaction?.parameters).toEqual([
      expect.objectContaining({ name: "transaction_id", in: "query" }),
    ]);
  });

  it("lists every documented endpoint of every provider", () => {
    for (const provider of providers) {
      for (const endpoint of provider.endpoints) {
        const path = `/v1/sandbox/${provider.identity.id}${endpoint.path.replace(/:(\w+)/g, "{$1}")}`;
        expect(
          english.paths[path]?.[endpoint.method.toLowerCase()],
          `${endpoint.method} ${path}`,
        ).toBeDefined();
      }
    }
  });

  it("documents the webhooks with their signature header", () => {
    const completed = english.webhooks["wave.checkout.session.completed"]?.post;
    expect(completed?.parameters?.map((parameter) => parameter.name)).toContain("wave-signature");
    expect(english.webhooks["wave.checkout.session.payment_failed"]).toBeDefined();
  });

  it("documents the local relay routes", () => {
    expect(english.paths["/v1/sandbox/listen"]?.get).toBeDefined();
    const result = english.paths["/v1/sandbox/deliveries/{id}/result"]?.post;
    expect(result?.requestBody?.content["application/json"]?.schema.required).toEqual([
      "status",
      "durationMs",
    ]);
  });

  it("speaks the reader's language and marks the providers unofficial", () => {
    const french = buildSandboxOpenApi(providers, "fr") as Doc;
    expect(french.paths["/v1/sandbox/listen"]?.get?.summary).not.toBe(
      english.paths["/v1/sandbox/listen"]?.get?.summary,
    );
    expect(english.info["x-providers"]).toEqual([
      expect.objectContaining({
        id: "wave",
        unofficial: true,
        docsUrl: "https://docs.wave.com/checkout",
      }),
    ]);
  });

  it("matches the published files in docs", async () => {
    for (const language of ["fr", "en"] as const) {
      const published = JSON.parse(await readFile(openApiFile(language), "utf8")) as unknown;
      expect(published, `run npm run openapi to refresh ${language}`).toEqual(
        buildSandboxOpenApi(providers, language),
      );
    }
  });
});

describe("GET /v1/sandbox/openapi.json", () => {
  it("serves the document in the requested language", async () => {
    const { app, close } = await createTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/sandbox/openapi.json",
      headers: { "accept-language": "fr" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      JSON.parse(JSON.stringify(buildSandboxOpenApi(providers, "fr"))),
    );
    await close();
  });
});
