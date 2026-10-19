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

const bearerPattern = /^Bearer (ovp_[\w-]{43})$/i;

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
  // One request, one call: a batch would multiply the API calls behind a single POST.
  if (Array.isArray(body)) throw new BodyError(400);
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

/** Editors send no Origin header; a browser page, DNS rebinding included, always does. */
async function route(options: HttpOptions, request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", "http://mcp.local");
  const language = pickLanguage(url.searchParams.get("lang") ?? options.language);
  const text = messagesFor(language);
  const token = bearerPattern.exec(request.headers.authorization ?? "")?.[1];
  if (url.pathname !== "/mcp") {
    reject(response, 404, text.errors.not_found);
  } else if (request.headers.origin !== undefined) {
    reject(response, 403, text.errors.bad_response);
  } else if (request.method !== "POST") {
    reject(response, 405, text.errors.bad_response);
  } else if (token === undefined) {
    reject(response, 401, text.errors.token_rejected);
  } else {
    await serve(options, language, token, request, response);
  }
}

/** Nothing a client sends may reject this promise: one bad request must not stop the server. */
function handler(options: HttpOptions) {
  const fallback = messagesFor(options.language).errors.bad_response;
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      await route(options, request, response);
    } catch (error) {
      const status =
        error instanceof BodyError ? error.status : error instanceof TypeError ? 400 : 500;
      if (!response.headersSent) reject(response, status, fallback);
      else response.end();
    }
  };
}

/** Stateless Streamable HTTP endpoint, meant to sit behind the reverse proxy on /mcp. */
export async function startHttp(options: HttpOptions): Promise<Server> {
  const handle = handler(options);
  const server = createHttpServer((request, response) => void handle(request, response));
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  await new Promise<void>((ready, fail) => {
    server.once("error", fail);
    server.listen(options.port, options.host, ready);
  });
  return server;
}
