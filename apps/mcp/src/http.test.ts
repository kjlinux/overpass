import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startHttp } from "./http.js";
import { startLocalApi } from "./testing.js";

let api: Awaited<ReturnType<typeof startLocalApi>>;
let http: Server;
let url: string;

beforeAll(async () => {
  api = await startLocalApi();
  http = await startHttp({ apiUrl: api.baseUrl, language: "en", host: "127.0.0.1", port: 0 });
  const address = http.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  url = `http://127.0.0.1:${String(port)}/mcp`;
});

afterAll(async () => {
  await new Promise((done) => http.close(done));
  await api.close();
});

const list = { jsonrpc: "2.0", id: 1, method: "tools/list" };
const json = { "content-type": "application/json", accept: "application/json, text/event-stream" };

function post(body: string, headers: Record<string, string> = {}, target = url) {
  return fetch(target, { method: "POST", body, headers: { ...json, ...headers } });
}

describe("mcp over http", () => {
  it("answers 401 with a bearer challenge when no token is sent", async () => {
    const response = await post(JSON.stringify(list));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toMatch(/^Bearer/);
  });

  it("only serves POST on /mcp", async () => {
    const auth = { authorization: `Bearer ${api.token}` };
    expect((await fetch(url, { headers: auth })).status).toBe(405);
    expect((await post("{}", auth, url.replace("/mcp", "/other"))).status).toBe(404);
  });

  it("rejects an oversized or malformed body", async () => {
    const auth = { authorization: `Bearer ${api.token}` };
    expect((await post("x".repeat(70_000), auth)).status).toBe(413);
    expect((await post("{not json", auth)).status).toBe(400);
  });

  it("runs a tool for the developer whose token is in the editor configuration", async () => {
    const transport = new StreamableHTTPClientTransport(new URL(`${url}?lang=fr`), {
      requestInit: { headers: { authorization: `Bearer ${api.token}` } },
    });
    const client = new Client({ name: "editor", version: "0.0.0" });
    await client.connect(transport as Transport);
    const { tools } = await client.listTools();
    expect(tools.find((tool) => tool.name === "list_services")?.title).toBe(
      "Lister les services couverts",
    );
    const result = await client.callTool({ name: "get_route", arguments: { id: api.plainId } });
    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result.content)).toContain(api.plainId);
    await client.close();
  });
});
