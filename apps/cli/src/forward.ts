import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export type Webhook = { method: string; headers: Record<string, string>; body: string };

export type LocalResult = {
  status: number | null;
  durationMs: number;
  error?: "timeout" | "connection_failed";
};

/** Replays the webhook as received: same method, same headers, same bytes, nothing added but transport. */
export function forwardWebhook(
  url: string,
  webhook: Webhook,
  timeoutMs: number,
): Promise<LocalResult> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const target = new URL(url);
  const send = target.protocol === "https:" ? httpsRequest : httpRequest;
  const body = Buffer.from(webhook.body, "utf8");
  const headers = { ...webhook.headers, "content-length": body.length.toString() };
  return new Promise((resolve) => {
    const outgoing = send(target, { method: webhook.method, headers, agent: false }, (response) => {
      response.resume();
      response.on("end", () => {
        finish({ status: response.statusCode ?? null, durationMs: elapsed() });
      });
    });
    const timer = setTimeout(() => {
      outgoing.destroy();
      finish({ status: null, durationMs: elapsed(), error: "timeout" });
    }, timeoutMs);
    function finish(result: LocalResult) {
      clearTimeout(timer);
      resolve(result);
    }
    outgoing.on("error", () => {
      finish({ status: null, durationMs: elapsed(), error: "connection_failed" });
    });
    outgoing.end(body);
  });
}
