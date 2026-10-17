import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OverpassApiClient } from "../client.js";
import { wrapUntrustedData } from "../data-guard.js";

const listPotholesSchema = {
  routeId: z.uuid().optional().describe("Itinerary identifier to filter by"),
  service: z.string().optional().describe("Operator slug to filter by, e.g. wave, cinetpay"),
};

export function registerListPotholesTool(server: McpServer, client: OverpassApiClient): void {
  server.registerTool(
    "list_potholes",
    {
      ["description"]:
        "List known pitfalls, edge cases and integration bugs reported by African developers",
      inputSchema: listPotholesSchema,
    },
    async ({ routeId, service }) => {
      const potholes = await client.listPotholes(routeId, service);
      const text =
        potholes.length === 0 ? "No potholes reported." : wrapUntrustedData("potholes", potholes);
      return {
        content: [{ type: "text", text }],
      };
    },
  );
}
