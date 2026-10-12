import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer, serverInfo } from "./server-info.js";

describe("mcp server", () => {
  it("completes the MCP handshake and exposes no tool yet", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "test", version: "0.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    expect(client.getServerVersion()).toMatchObject(serverInfo);
    expect(client.getServerCapabilities()?.tools).toBeUndefined();
    await client.close();
  });
});
