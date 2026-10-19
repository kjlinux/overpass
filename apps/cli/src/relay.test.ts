import { createServer } from "node:http";
import type { Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startRelay } from "./relay.js";
import type { RelayEvent } from "./relay.js";

const key = "ovp_test_valid";
let api: Server;
let local: Server;
let apiUrl: string;
let localUrl: string;
let seenLastIds: (string | undefined)[];
let results: { id: string; body: unknown }[];
let localBodies: string[];

const frame = (id: number, amount: number) =>
  `id: ${String(id)}\nevent: webhook\ndata: ${JSON.stringify({
    deliveryId: `d${String(id)}`,
    eventType: "checkout.session.completed",
    method: "POST",
    headers: { "content-type": "application/json", "wave-signature": `t=1,v1=${String(id)}` },
    body: `{"amount": "${String(amount)}"}`,
  })}\n\n`;

function serveStream(response: ServerResponse, connection: number) {
  response.writeHead(200, { "content-type": "text/event-stream" });
  response.write('event: ready\ndata: {"provider":"wave","keyPrefix":"ovp_test_vali"}\n\n');
  if (connection === 1) {
    response.end(frame(5, 100));
    return;
  }
  response.write(frame(5, 100) + frame(6, 200));
}

async function listenOn(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

beforeEach(async () => {
  seenLastIds = [];
  results = [];
  localBodies = [];
  let connections = 0;
  api = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${key}`) {
      response
        .writeHead(401, { "content-type": "application/json" })
        .end('{"data":null,"error":{"code":"unauthorized"}}');
      return;
    }
    if (request.url === "/v1/sandbox/listen") {
      seenLastIds.push(request.headers["last-event-id"] as string | undefined);
      serveStream(response, ++connections);
      return;
    }
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const id = /deliveries\/(\w+)\/result/.exec(request.url ?? "")?.[1] ?? "";
      results.push({ id, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
      response.writeHead(200).end("{}");
    });
  });
  local = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      localBodies.push(Buffer.concat(chunks).toString("utf8"));
      response.writeHead(200).end();
    });
  });
  apiUrl = await listenOn(api);
  localUrl = `${await listenOn(local)}/webhook`;
});

afterEach(async () => {
  api.closeAllConnections();
  await Promise.all([api, local].map((server) => new Promise((resolve) => server.close(resolve))));
});

const until = async (check: () => boolean) => {
  for (let attempt = 0; attempt < 200 && !check(); attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 10));
};

describe("startRelay", () => {
  it("forwards, reports, reconnects after the last id and never forwards twice", async () => {
    const events: RelayEvent[] = [];
    const relay = startRelay({
      api: apiUrl,
      key,
      forwardTo: localUrl,
      report: (event) => events.push(event),
      backoff: { initialMs: 10, maxMs: 20 },
    });
    await until(() => results.length === 2);
    await relay.stop();
    expect(localBodies).toEqual(['{"amount": "100"}', '{"amount": "200"}']);
    expect(results.map((result) => result.id)).toEqual(["d5", "d6"]);
    expect(results[0]?.body).toMatchObject({ status: 200 });
    expect(seenLastIds.slice(0, 2)).toEqual([undefined, "5"]);
    expect(events.map((event) => event.type)).toContain("reconnecting");
    expect(events.filter((event) => event.type === "forwarded")).toHaveLength(2);
  });

  it("stops for good when the key is refused", async () => {
    const events: RelayEvent[] = [];
    const relay = startRelay({
      api: apiUrl,
      key: "ovp_test_wrong",
      forwardTo: localUrl,
      report: (event) => events.push(event),
      backoff: { initialMs: 10, maxMs: 20 },
    });
    expect(await relay.done).toBe("unauthorized");
    expect(events).toEqual([{ type: "unauthorized" }]);
  });
});
