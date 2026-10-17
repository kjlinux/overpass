import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OverpassApiClient } from "../client.js";
import { wrapUntrustedData } from "../data-guard.js";

const getRouteSchema = {
  routeId: z.uuid().describe("Unique identifier of the itinerary"),
};

export function registerGetRouteTool(server: McpServer, client: OverpassApiClient): void {
  server.registerTool(
    "get_route",
    {
      ["description"]:
        "Read a verified integration itinerary with Markdown content and known pitfalls",
      inputSchema: getRouteSchema,
    },

    async ({ routeId }) => {
      const route = await client.getRoute(routeId);
      if (!route) {
        return {
          content: [{ type: "text", text: `Itinerary ${routeId} not found.` }],
        };
      }
      return {
        content: [{ type: "text", text: wrapUntrustedData("itinerary", route) }],
      };
    },
  );
}
