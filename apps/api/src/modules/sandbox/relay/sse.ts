import type { ServerResponse } from "node:http";
import type { RelayWebhook } from "@overpass/shared";
import type { RelayDelivery } from "./repository.js";

export const heartbeatMs = 15_000;

export function openEventStream(raw: ServerResponse): void {
  raw.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
}

/** One SSE frame; data is JSON on one line, so it never contains a blank line. */
export function writeEvent(raw: ServerResponse, event: string, data: unknown, id?: number): void {
  const head = id === undefined ? "" : `id: ${id.toString()}\n`;
  raw.write(`${head}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** The body travels as the exact string the provider signed; headers travel untouched. */
export function writeDelivery(raw: ServerResponse, delivery: RelayDelivery): void {
  const data: RelayWebhook = {
    deliveryId: delivery.id,
    eventType: delivery.eventType,
    source: "simulated",
    method: "POST",
    headers: delivery.headers as Record<string, string>,
    body: delivery.body,
  };
  writeEvent(raw, "webhook", data, delivery.sentSeq ?? undefined);
}

export function writeHeartbeat(raw: ServerResponse): void {
  raw.write(": ping\n\n");
}
