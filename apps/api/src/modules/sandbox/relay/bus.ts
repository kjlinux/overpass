import { PostgresListener, type ListenClient } from "./listener.js";
import pg from "pg";
import type { Notifier } from "../delivery/worker.js";
import { relayChannel } from "../delivery/worker.js";

export type RelayMessage = { keyId: string; deliveryId: string };
type Handler = (message: RelayMessage) => void;

/** Carries "this delivery is ready" from any worker to every API instance. */
export type RelayBus = Notifier & {
  subscribe(handler: Handler): () => void;
  /** Runs after the listener came back from a loss: notifications sent meanwhile were missed. */
  onReconnect(handler: () => void): () => void;
  close(): Promise<void>;
};

type Log = { error(details: unknown, message?: string): void };
const defaultRetryMs = 1000;
const defaultMaxRetryMs = 30_000;

function parse(payload: string | undefined): RelayMessage | undefined {
  try {
    const value = JSON.parse(payload ?? "") as Partial<RelayMessage>;
    return typeof value.keyId === "string" && typeof value.deliveryId === "string"
      ? { keyId: value.keyId, deliveryId: value.deliveryId }
      : undefined;
  } catch {
    return undefined;
  }
}

function handlers() {
  const set = new Set<Handler>();
  return {
    subscribe(handler: Handler) {
      set.add(handler);
      return () => set.delete(handler);
    },
    emit(payload: string | undefined) {
      const message = parse(payload);
      if (message !== undefined) for (const handler of set) handler(message);
    },
  };
}

/** One process, no database: tests and single-instance development. */
export function memoryBus(): RelayBus {
  const local = handlers();
  return {
    subscribe: (handler) => local.subscribe(handler),
    onReconnect: () => () => undefined,
    notify(channel, payload) {
      if (channel === relayChannel) local.emit(payload);
      return Promise.resolve();
    },
    close: () => Promise.resolve(),
  };
}

export type PostgresBusOptions = {
  createClient?: () => ListenClient;
  retryMs?: number;
  maxRetryMs?: number;
};

/** A dedicated connection that LISTENs, so every instance hears every worker. */
export function postgresBus(url: string, log: Log, options: PostgresBusOptions = {}): RelayBus {
  const local = handlers();
  const reconnects = new Set<() => void>();
  const listener = new PostgresListener({
    create: options.createClient ?? (() => new pg.Client({ connectionString: url })),
    channel: relayChannel,
    retryMs: options.retryMs ?? defaultRetryMs,
    maxRetryMs: options.maxRetryMs ?? defaultMaxRetryMs,
    log,
    onNotification: (payload) => {
      local.emit(payload);
    },
    onReconnect: () => {
      for (const handler of reconnects) handler();
    },
  });
  listener.start();
  return {
    subscribe: (handler) => local.subscribe(handler),
    onReconnect(handler) {
      reconnects.add(handler);
      return () => reconnects.delete(handler);
    },
    notify: (channel, payload) => listener.query("select pg_notify($1, $2)", [channel, payload]),
    close: () => listener.close(),
  };
}
