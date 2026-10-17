import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HttpOverpassClient } from "./client.js";
import type { OverpassApiClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";

export const serverInfo = { name: "overpass", version: "0.0.0" } as const;

/** Creates the read-only MCP server and registers consultation and simulation tools. */
export function createServer(client: OverpassApiClient = new HttpOverpassClient()): McpServer {
  const server = new McpServer(serverInfo);
  registerAllTools(server, client);
  return server;
}
