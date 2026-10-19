import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Language } from "@overpass/shared";
import type { ApiClient } from "./api/client.js";
import { messagesFor } from "./messages.js";
import { registerTools } from "./tools/index.js";

export const serverInfo = { name: "overpass", version: "0.1.0" } as const;

export type ServerOptions = { client: ApiClient; language: Language; now?: () => Date };

/** The read-only MCP server: it embeds no model and reads only through the API. */
export function createServer({ client, language, now = () => new Date() }: ServerOptions) {
  const text = messagesFor(language);
  const server = new McpServer(serverInfo, { instructions: text.instructions });
  registerTools(server, { client, text, now });
  return server;
}
