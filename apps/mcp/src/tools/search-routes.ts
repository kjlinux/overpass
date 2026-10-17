import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OverpassApiClient } from "../client.js";
import { wrapUntrustedData } from "../data-guard.js";

const searchSchema = {
  query: z.string().optional().describe("Free text search query"),
  service: z.string().optional().describe("Operator slug, e.g. wave, cinetpay, pispi, paydunya"),
  country: z.string().length(2).optional().describe("Two-letter country code, e.g. CI, SN"),
  stack: z.string().optional().describe("Technology stack, e.g. laravel, nodejs, django"),
  language: z.enum(["fr", "en"]).optional().describe("Language of the itinerary"),
};

export function registerSearchRoutesTool(server: McpServer, client: OverpassApiClient): void {
  server.registerTool(
    "search_routes",
    {
      ["description"]: "Search verified African payment integration itineraries and pitfalls",
      inputSchema: searchSchema,
    },

    async (params) => {
      const routes = await client.searchRoutes(params);
      const text =
        routes.length === 0 ? "No itineraries found." : wrapUntrustedData("routes", routes);
      return {
        content: [{ type: "text", text }],
      };
    },
  );
}
