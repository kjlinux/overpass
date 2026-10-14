import { forwardWebhook } from "./forward.js";
import type { LocalResult, Webhook } from "./forward.js";
import { createSseParser } from "./sse.js";
import type { SseFrame } from "./sse.js";

export type RelayEvent =
  | { type: "ready"; provider: string; keyPrefix: string }
  | { type: "forwarded"; eventType: string; result: LocalResult }
  | { type: "reconnecting"; inMs: number }
  | { type: "report_failed" }
  | { type: "unauthorized" };

export type RelayOptions = {
  api: string;
  key: string;
  forwardTo: string;
  report: (event: RelayEvent) => void;
  backoff?: { initialMs: number; maxMs: number };
  timeoutMs?: number;
};

type Delivery = Webhook & { deliveryId: string; eventType: string };
type State = {
  lastId: string | undefined;
  seen: Set<string>;
  stopped: boolean;
  controller: AbortController;
};

const seenLimit = 1000;
const localTimeoutMs = 10_000;

async function reportResult(options: RelayOptions, deliveryId: string, result: LocalResult) {
  const url = `${options.api}/v1/sandbox/deliveries/${encodeURIComponent(deliveryId)}/result`;
  const headers = { authorization: `Bearer ${options.key}`, "content-type": "application/json" };
  try {
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(result) });
    if (!response.ok) options.report({ type: "report_failed" });
  } catch {
    options.report({ type: "report_failed" });
  }
}

async function handleFrame(options: RelayOptions, state: State, frame: SseFrame): Promise<boolean> {
  if (frame.event === "ready") {
    const ready = JSON.parse(frame.data) as { provider: string; keyPrefix: string };
    options.report({ type: "ready", provider: ready.provider, keyPrefix: ready.keyPrefix });
    return true;
  }
  if (frame.event !== "webhook") return false;
  const delivery = JSON.parse(frame.data) as Delivery;
  state.lastId = frame.id ?? state.lastId;
  if (state.seen.has(delivery.deliveryId)) return false;
  state.seen.add(delivery.deliveryId);
  if (state.seen.size > seenLimit) state.seen.delete(state.seen.values().next().value ?? "");
  const result = await forwardWebhook(
    options.forwardTo,
    delivery,
    options.timeoutMs ?? localTimeoutMs,
  );
  options.report({ type: "forwarded", eventType: delivery.eventType, result });
  await reportResult(options, delivery.deliveryId, result);
  return false;
}

/** One connection; resolves "unauthorized" on a refused key, otherwise when the stream ends. */
async function connectOnce(options: RelayOptions, state: State, onReady: () => void) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${options.key}`,
    accept: "text/event-stream",
  };
  if (state.lastId !== undefined) headers["last-event-id"] = state.lastId;
  const response = await fetch(`${options.api}/v1/sandbox/listen`, {
    headers,
    signal: state.controller.signal,
  });
  if (response.status === 401) return "unauthorized";
  if (!response.ok || response.body === null) return "ended";
  const parser = createSseParser();
  for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
    for (const frame of parser.push(chunk)) {
      if (await handleFrame(options, state, frame)) onReady();
    }
  }
  return "ended";
}

type Backoff = { initialMs: number; maxMs: number };
type Pause = (ms: number) => Promise<void>;

/** Read through a function so each check sees what stop() wrote meanwhile. */
const isStopped = (state: State) => state.stopped;

async function runLoop(options: RelayOptions, state: State, backoff: Backoff, pause: Pause) {
  let delay = backoff.initialMs;
  const reset = () => {
    delay = backoff.initialMs;
  };
  while (!isStopped(state)) {
    const outcome = await connectOnce(options, state, reset).catch(() => "ended" as const);
    if (outcome === "unauthorized") {
      options.report({ type: "unauthorized" });
      return "unauthorized" as const;
    }
    if (isStopped(state)) break;
    options.report({ type: "reconnecting", inMs: delay });
    await pause(delay);
    delay = Math.min(delay * 2, backoff.maxMs);
  }
  return "stopped" as const;
}

/** Keeps one outgoing stream open, reconnecting with backoff and resuming after the last id. */
export function startRelay(options: RelayOptions) {
  const backoff = options.backoff ?? { initialMs: 1000, maxMs: 30_000 };
  const state: State = {
    lastId: undefined,
    seen: new Set(),
    stopped: false,
    controller: new AbortController(),
  };
  let wake: (() => void) | undefined;
  const pause: Pause = (ms) =>
    new Promise<void>((resolve) => {
      wake = resolve;
      setTimeout(resolve, ms);
    });
  const done = runLoop(options, state, backoff, pause);
  return {
    done,
    async stop(): Promise<void> {
      state.stopped = true;
      state.controller.abort();
      wake?.();
      await done;
    },
  };
}
