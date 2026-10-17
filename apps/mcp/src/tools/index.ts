import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OverpassApiClient } from "../client.js";
import { registerGetRouteTool } from "./get-route.js";
import { registerListPotholesTool } from "./list-potholes.js";
import { registerSearchRoutesTool } from "./search-routes.js";
import { registerSimulatePaymentTool } from "./simulate-payment.js";

export function registerAllTools(server: McpServer, client: OverpassApiClient): void {
  registerSearchRoutesTool(server, client);
  registerGetRouteTool(server, client);
  registerListPotholesTool(server, client);
  registerSimulatePaymentTool(server, client);
}
