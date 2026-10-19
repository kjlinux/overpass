import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { registerGetRoute } from "./get-route.js";
import { registerListPotholes } from "./list-potholes.js";
import { registerListServices } from "./list-services.js";
import { registerSearchRoutes } from "./search-routes.js";

export type { ToolContext } from "./context.js";

export function registerTools(server: McpServer, ctx: ToolContext): void {
  registerSearchRoutes(server, ctx);
  registerGetRoute(server, ctx);
  registerListPotholes(server, ctx);
  registerListServices(server, ctx);
}
