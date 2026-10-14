import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";

export type WebhookRequest = {
  url: string;
  addresses: readonly string[];
  body: string;
  headers: Readonly<Record<string, string>>;
  timeoutMs: number;
};

export type SendResult = {
  status: number | null;
  durationMs: number;
  error?: "timeout" | "connection_failed";
};

const responseLimit = 65_536;
const userAgent = "Overpass-Sandbox/1.0";

/** Answers every DNS question with the addresses checked earlier, so no rebinding can slip in. */
function pinnedLookup(addresses: readonly string[]): LookupFunction {
  const entries = addresses.map((address) => ({ address, family: isIP(address) }));
  return (_host, options, callback) => {
    const first = entries[0] ?? { address: "", family: 4 };
    if (options.all === true) callback(null, entries);
    else callback(null, first.address, first.family);
  };
}

function headersFor(request: WebhookRequest): Record<string, string> {
  return {
    "user-agent": userAgent,
    ...request.headers,
    "content-length": Buffer.byteLength(request.body).toString(),
  };
}

/** One POST, no redirect, no keep-alive, a hard deadline and a capped response. */
export function sendWebhook(request: WebhookRequest): Promise<SendResult> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const url = new URL(request.url);
  const send = url.protocol === "https:" ? httpsRequest : httpRequest;
  const options = {
    method: "POST",
    headers: headersFor(request),
    agent: false,
    lookup: pinnedLookup(request.addresses),
  } as const;
  return new Promise((resolve) => {
    const outgoing = send(url, options, (response) => {
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > responseLimit) response.destroy();
      });
      response.on("close", () => {
        finish({ status: response.statusCode ?? null, durationMs: elapsed() });
      });
    });
    const timer = setTimeout(() => {
      outgoing.destroy();
      finish({ status: null, durationMs: elapsed(), error: "timeout" });
    }, request.timeoutMs);
    function finish(result: SendResult) {
      clearTimeout(timer);
      resolve(result);
    }
    outgoing.on("error", () => {
      finish({ status: null, durationMs: elapsed(), error: "connection_failed" });
    });
    outgoing.end(request.body);
  });
}
