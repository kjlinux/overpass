import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const serverInfo = { name: "overpass", version: "0.0.0" } as const;

/** Creates the read-only MCP server; tools are registered by later features. */
export function createServer(): McpServer {
  return new McpServer(serverInfo);
}
