import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { RouteDetail, RouteSummary } from "@overpass/shared";
import { describe, expect, it } from "vitest";
import type { OverpassApiClient } from "./client.js";
import { createServer, serverInfo } from "./server-info.js";

const mockRouteSummary: RouteSummary = {
  id: "00000000-0000-4000-8000-000000000001",
  service: { slug: "wave", name: "Wave", simulated: true },
  country: "CI",
  stack: "laravel",
  language: "fr",
  title: "Wave Laravel Checkout",
  author: "dev-kofi",
  version: 1,
  state: "clear",
  recentCheckers: 3,
  unresolvedPotholes: 0,
  lastCheckAt: "2026-10-15T12:00:00Z",
  updatedAt: "2026-10-15T12:00:00Z",
};

const mockRouteDetail: RouteDetail = {
  ...mockRouteSummary,
  content: "```php\nWave::checkout();\n```",
  fallback: false,
  translations: [],
  checks: [],
  potholes: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      handle: "dev-awa",
      description: "Webhook timeout on live network",
      status: "confirmed",
      createdAt: "2026-10-16T10:00:00Z",
      updatedAt: "2026-10-16T10:00:00Z",
    },
  ],
  viewer: { isAuthor: false, eligibility: "allowed", nextCheckAt: null },
};

const mockClient: OverpassApiClient = {
  searchRoutes: () => Promise.resolve([mockRouteSummary]),
  getRoute: (id) => Promise.resolve(id === mockRouteSummary.id ? mockRouteDetail : null),
  listPotholes: () => Promise.resolve(mockRouteDetail.potholes),
  simulatePayment: () => Promise.resolve({ status: "ACCEPTED", simulated: true }),
};

describe("mcp server", () => {
  async function setup() {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer(mockClient);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return { client, server };
  }

  it("handshakes and exposes all consultation and simulation tools", async () => {
    const { client } = await setup();
    expect(client.getServerVersion()).toMatchObject(serverInfo);
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("search_routes");
    expect(names).toContain("get_route");
    expect(names).toContain("list_potholes");
    expect(names).toContain("simulate_payment");
    await client.close();
  });

  it("calls search_routes and returns tagged community data", async () => {
    const { client } = await setup();
    const res = await client.callTool({
      name: "search_routes",
      arguments: { service: "wave", country: "CI" },
    });
    const text = (res.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
    expect(text).toContain('<untrusted_community_data type="routes">');
    expect(text).toContain("Wave Laravel Checkout");
    await client.close();
  });

  it("calls get_route and returns itinerary with pitfalls", async () => {
    const { client } = await setup();
    const res = await client.callTool({
      name: "get_route",
      arguments: { routeId: mockRouteSummary.id },
    });
    const text = (res.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
    expect(text).toContain('<untrusted_community_data type="itinerary">');
    expect(text).toContain("Wave::checkout();");
    await client.close();
  });

  it("calls list_potholes and returns pitfalls list", async () => {
    const { client } = await setup();
    const res = await client.callTool({
      name: "list_potholes",
      arguments: { routeId: mockRouteSummary.id },
    });
    const text = (res.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
    expect(text).toContain("Webhook timeout on live network");
    await client.close();
  });

  it("calls simulate_payment and returns simulation outcome", async () => {
    const { client } = await setup();
    const res = await client.callTool({
      name: "simulate_payment",
      arguments: { provider: "wave", scenario: "payment_success" },
    });
    const text = (res.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
    expect(text).toContain("ACCEPTED");
    await client.close();
  });
});
