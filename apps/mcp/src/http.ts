import { createServer as createHttpServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { pickLanguage } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import { createApiClient } from "./api/client.js";
import type { Config } from "./config.js";
import { BodyError, readJsonBody } from "./http-body.js";
import { messagesFor } from "./messages.js";
import { createServer } from "./server-info.js";

export type HttpOptions = Omit<Config, "token">;

const bearerPattern = /^Bearer ([\w.~+/=-]{1,256})$/i;

function reject(response: ServerResponse, status: number, message: string): void {
  if (status === 401) response.setHeader("www-authenticate", 'Bearer realm="overpass"');
  if (status === 405) response.setHeader("allow", "POST");
  const error = { jsonrpc: "2.0", error: { code: -32000, message }, id: null };
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(error));
}

/** The editor's personal token travels with each request and goes straight to the API. */
async function serve(
  options: HttpOptions,
  language: Language,
  token: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = await readJsonBody(request);
  const client = createApiClient({ baseUrl: options.apiUrl, token, language });
  const server = createServer({ client, language });
  // No session id generator: each request is self-contained, so any instance can answer it.
  const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
  response.on("close", () => {
    void transport.close();
    void server.close();
  });
  // The SDK types predate exactOptionalPropertyTypes; the transport is the SDK's own.
  await server.connect(transport as Transport);
  await transport.handleRequest(request, response, body);
}

function handler(options: HttpOptions) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://mcp.local");
    const language = pickLanguage(url.searchParams.get("lang") ?? options.language);
    const text = messagesFor(language);
    const token = bearerPattern.exec(request.headers.authorization ?? "")?.[1];
    if (url.pathname !== "/mcp") {
      reject(response, 404, text.errors.not_found);
    } else if (request.method !== "POST") {
      reject(response, 405, text.errors.bad_response);
    } else if (token === undefined) {
      reject(response, 401, text.errors.token_rejected);
    } else {
      await answer(options, language, token, request, response);
    }
  };
}

async function answer(
  options: HttpOptions,
  language: Language,
  token: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const text = messagesFor(language);
  try {
    await serve(options, language, token, request, response);
  } catch (error) {
    const status = error instanceof BodyError ? error.status : 500;
    if (!response.headersSent) reject(response, status, text.errors.bad_response);
  }
}

/** Stateless Streamable HTTP endpoint, meant to sit behind the reverse proxy on /mcp. */
export async function startHttp(options: HttpOptions): Promise<Server> {
  const server = createHttpServer((request, response) => void handler(options)(request, response));
  await new Promise<void>((ready) => server.listen(options.port, options.host, ready));
  return server;
}
