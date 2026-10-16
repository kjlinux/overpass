import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Server } from "node:http";
import { connect } from "node:net";
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

  it("refuses a token that does not have the Overpass format before calling the API", async () => {
    const response = await post(JSON.stringify(list), { authorization: "Bearer not-a-token" });
    expect(response.status).toBe(401);
  });

  it("refuses JSON-RPC batches, which would multiply API calls", async () => {
    const auth = { authorization: `Bearer ${api.token}` };
    expect((await post(JSON.stringify([list, list]), auth)).status).toBe(400);
  });

  it("refuses browser requests, which carry an Origin header", async () => {
    const headers = { authorization: `Bearer ${api.token}`, origin: "https://evil.example" };
    expect((await post(JSON.stringify(list), headers)).status).toBe(403);
  });

  it("bounds how long a client may take to send its request", () => {
    expect(http.requestTimeout).toBe(15_000);
    expect(http.headersTimeout).toBe(10_000);
  });

  it("only serves POST on /mcp", async () => {
    const auth = { authorization: `Bearer ${api.token}` };
    expect((await fetch(url, { headers: auth })).status).toBe(405);
    expect((await post("{}", auth, url.replace("/mcp", "/other"))).status).toBe(404);
  });

  it("survives a malformed request target and keeps serving", async () => {
    const port = new URL(url).port;
    const raw = await new Promise<string>((done) => {
      const socket = connect(Number(port), "127.0.0.1", () => {
        const crlf = String.fromCharCode(13, 10);
        socket.end(["POST //[ HTTP/1.1", "Host: x", "Content-Length: 0", "", ""].join(crlf));
      });
      let text = "";
      socket.on("data", (chunk) => (text += String(chunk)));
      socket.on("close", () => {
        done(text);
      });
    });
    expect(raw.startsWith("HTTP/1.1 400")).toBe(true);
    expect((await post(JSON.stringify(list))).status).toBe(401);
  });

  it("refuses to start on a port already in use", async () => {
    const port = Number(new URL(url).port);
    const options = { apiUrl: api.baseUrl, language: "en" as const, host: "127.0.0.1", port };
    await expect(startHttp(options)).rejects.toThrow();
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
