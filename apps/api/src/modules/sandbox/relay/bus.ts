import pg from "pg";
import type { Notifier } from "../delivery/worker.js";
import { relayChannel } from "../delivery/worker.js";

export type RelayMessage = { keyId: string; deliveryId: string };
type Handler = (message: RelayMessage) => void;

/** Carries "this delivery is ready" from any worker to every API instance. */
export type RelayBus = Notifier & {
  subscribe(handler: Handler): () => void;
  close(): Promise<void>;
};

type Log = { error(details: unknown, message?: string): void };

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
    notify(channel, payload) {
      if (channel === relayChannel) local.emit(payload);
      return Promise.resolve();
    },
    close: () => Promise.resolve(),
  };
}

const reconnectMs = 1000;

/** A dedicated connection that LISTENs, so every instance hears every worker. */
export function postgresBus(url: string, log: Log): RelayBus {
  const local = handlers();
  let client: pg.Client | undefined;
  let closed = false;
  const connect = async (): Promise<void> => {
    const next = new pg.Client({ connectionString: url });
    next.on("notification", (message) => {
      local.emit(message.payload);
    });
    next.on("error", (error) => {
      log.error({ err: error }, "relay listener lost its connection");
      if (!closed) setTimeout(() => void connect().catch(() => undefined), reconnectMs);
    });
    await next.connect();
    await next.query(`listen ${relayChannel}`);
    client = next;
  };
  void connect().catch((error: unknown) => {
    log.error({ err: error }, "relay listener could not connect");
  });
  return {
    subscribe: (handler) => local.subscribe(handler),
    async notify(channel, payload) {
      await client?.query("select pg_notify($1, $2)", [channel, payload]);
    },
    async close() {
      closed = true;
      await client?.end();
    },
  };
}
