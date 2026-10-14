import { createServer } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sendWebhook } from "./http-client.js";

type Received = {
  method?: string;
  url?: string;
  headers: IncomingMessage["headers"];
  body: string;
};

let server: Server;
let port: number;
let received: Received[];
let answer: (url: string) => { status: number; headers?: Record<string, string>; delayMs?: number };

beforeEach(async () => {
  received = [];
  answer = () => ({ status: 204 });
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      received.push({ method: request.method, url: request.url, headers: request.headers, body });
      const reply = answer(request.url ?? "");
      setTimeout(
        () => response.writeHead(reply.status, reply.headers).end("ok"),
        reply.delayMs ?? 0,
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});
afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

const body = '{"id":"evt_1", "type":"checkout.session.completed", "data":{"amount":"1000"}}';
const headers = { "content-type": "application/json", "wave-signature": "t=1,v1=abc" };

describe("sendWebhook", () => {
  it("posts the exact body and headers to the pinned address", async () => {
    const url = `http://hooks.invalid:${String(port)}/webhook?x=1`;
    const result = await sendWebhook({
      url,
      addresses: ["127.0.0.1"],
      body,
      headers,
      timeoutMs: 2000,
    });
    expect(result).toMatchObject({ status: 204 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(received[0]).toMatchObject({ method: "POST", url: "/webhook?x=1", body });
    expect(received[0]?.headers).toMatchObject({
      ...headers,
      host: `hooks.invalid:${String(port)}`,
    });
  });

  it("reports a redirect without following it", async () => {
    answer = (url) =>
      url === "/start" ? { status: 302, headers: { location: "/next" } } : { status: 200 };
    const url = `http://hooks.invalid:${String(port)}/start`;
    const result = await sendWebhook({
      url,
      addresses: ["127.0.0.1"],
      body,
      headers,
      timeoutMs: 2000,
    });
    expect(result.status).toBe(302);
    expect(received.map((request) => request.url)).toEqual(["/start"]);
  });

  it("gives up after the timeout", async () => {
    answer = () => ({ status: 200, delayMs: 500 });
    const url = `http://hooks.invalid:${String(port)}/slow`;
    const result = await sendWebhook({
      url,
      addresses: ["127.0.0.1"],
      body,
      headers,
      timeoutMs: 100,
    });
    expect(result).toMatchObject({ status: null, error: "timeout" });
  });

  it("reports a refused connection", async () => {
    const url = "http://hooks.invalid:1/x";
    const result = await sendWebhook({
      url,
      addresses: ["127.0.0.1"],
      body,
      headers,
      timeoutMs: 2000,
    });
    expect(result).toMatchObject({ status: null, error: "connection_failed" });
  });
});
