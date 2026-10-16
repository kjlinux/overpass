import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createApiClient } from "./api/client.js";
import { loadConfig } from "./config.js";
import { startHttp } from "./http.js";
import { createServer } from "./server-info.js";

const config = loadConfig();

/** Over stdio the editor starts the server itself, so the token comes from its environment. */
async function startStdio(token: string | undefined): Promise<void> {
  if (token === undefined) throw new Error("OVERPASS_TOKEN is required with --stdio");
  const client = createApiClient({ baseUrl: config.apiUrl, token, language: config.language });
  await createServer({ client, language: config.language }).connect(new StdioServerTransport());
}

if (process.argv.includes("--stdio")) {
  await startStdio(config.token);
} else {
  await startHttp(config);
  process.stderr.write(
    `overpass mcp listening on http://${config.host}:${String(config.port)}/mcp\n`,
  );
}
