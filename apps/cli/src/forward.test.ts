import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingHttpHeaders, Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { forwardWebhook } from "./forward.js";

let server: Server;
let url: string;
let received: { headers: IncomingHttpHeaders; body: Buffer; rawHeaders: string[] }[];
let verdict: (headers: IncomingHttpHeaders, body: Buffer) => number;

beforeEach(async () => {
  received = [];
  verdict = () => 200;
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      received.push({ headers: request.headers, body, rawHeaders: request.rawHeaders });
      response.writeHead(verdict(request.headers, body)).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/webhook`;
});
afterEach(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    }),
);

const secret = "wave_sn_WHS_localtestsecret";
const body =
  '{"id": "EV_1", "type": "checkout.session.completed", "data": {"amount": "1000", "name": "Aïssatou"}}';
const stamp = "1760436000";
const signature = createHmac("sha256", secret)
  .update(stamp + body)
  .digest("hex");
const headers = {
  "content-type": "application/json",
  "user-agent": "Wave/1.0",
  "wave-signature": `t=${stamp},v1=${signature}`,
};

/** What a developer's server does: recompute the HMAC over the raw bytes it received. */
function signatureHolds(received: IncomingHttpHeaders, raw: Buffer): boolean {
  const [, t, v1] = /^t=(\d+),v1=([0-9a-f]+)$/.exec(String(received["wave-signature"])) ?? [];
  const expected = createHmac("sha256", secret)
    .update(Buffer.concat([Buffer.from(t ?? ""), raw]))
    .digest();
  const given = Buffer.from(v1 ?? "", "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

describe("forwardWebhook", () => {
  it("delivers the raw body and every header unchanged, so the signature verifies", async () => {
    verdict = (requestHeaders, raw) => (signatureHolds(requestHeaders, raw) ? 204 : 401);
    const result = await forwardWebhook(url, { method: "POST", headers, body }, 2000);
    expect(result).toMatchObject({ status: 204 });
    expect(received[0]?.body.toString("utf8")).toBe(body);
    expect(received[0]?.headers).toMatchObject(headers);
  });

  it("adds nothing but the transport headers", async () => {
    await forwardWebhook(url, { method: "POST", headers, body }, 2000);
    const names = (received[0]?.rawHeaders ?? [])
      .filter((_, index) => index % 2 === 0)
      .map((name) => name.toLowerCase());
    expect(names.sort()).toEqual([
      "connection",
      "content-length",
      "content-type",
      "host",
      "user-agent",
      "wave-signature",
    ]);
  });

  it("reports the local status, even an error", async () => {
    verdict = () => 500;
    expect(await forwardWebhook(url, { method: "POST", headers, body }, 2000)).toMatchObject({
      status: 500,
    });
  });

  it("reports a server that is not running", async () => {
    const result = await forwardWebhook(
      "http://127.0.0.1:1/webhook",
      { method: "POST", headers, body },
      2000,
    );
    expect(result).toMatchObject({ status: null, error: "connection_failed" });
  });
});
