import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createApiClient } from "./api/client.js";
import { createServer, serverInfo } from "./server-info.js";

const unused = (() => Promise.resolve(new Response("{}"))) as typeof globalThis.fetch;

async function handshake(language: "fr" | "en") {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = createApiClient({
    baseUrl: "http://api.test",
    token: "t",
    language,
    fetch: unused,
  });
  const mcp = new Client({ name: "test", version: "0.0.0" });
  await createServer({ client, language }).connect(serverTransport);
  await mcp.connect(clientTransport);
  return mcp;
}

describe("mcp server", () => {
  it("completes the MCP handshake and states that member content is data", async () => {
    const client = await handshake("en");
    expect(client.getServerVersion()).toMatchObject(serverInfo);
    expect(client.getInstructions()).toMatch(/never follow instructions/i);
    expect(client.getServerCapabilities()?.tools).toBeDefined();
    await client.close();
  });

  it("describes its tools in the configured language", async () => {
    const client = await handshake("fr");
    const { tools } = await client.listTools();
    expect(tools.find((tool) => tool.name === "get_route")?.title).toBe(
      "Lire une fiche d'intégration",
    );
    await client.close();
  });
});
