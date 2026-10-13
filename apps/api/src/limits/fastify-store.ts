import type { FastifyRateLimitOptions, FastifyRateLimitStore } from "@fastify/rate-limit";
import type { CounterState, CounterStore } from "./counters.js";

type Callback = (error: Error | null, result?: { current: number; ttl: number }) => void;
type ChildOptions = Parameters<FastifyRateLimitStore["child"]>[0];
type RouteInfo = { method: unknown; url: unknown };

const purgeEveryMs = 60_000;

/** Hands a counter result, or its failure, to the plugin's callback. */
function answer(state: Promise<CounterState>, callback: Callback): void {
  state.then(
    ({ count, ttlMs }) => {
      callback(null, { current: count, ttl: ttlMs });
    },
    (error: unknown) => {
      callback(error instanceof Error ? error : new Error(String(error)));
    },
  );
}

/** Plugs the shared counters into @fastify/rate-limit, one key prefix per route. */
export function counterStoreFor(counters: CounterStore) {
  let lastPurge = 0;
  const purgeNow = () => {
    if (Date.now() - lastPurge < purgeEveryMs) return;
    lastPurge = Date.now();
    void counters.purgeExpired().catch(() => undefined);
  };

  return class CounterRateLimitStore implements FastifyRateLimitStore {
    constructor(
      _options: FastifyRateLimitOptions,
      readonly prefix = "rl:",
    ) {}

    incr(key: string, callback: Callback, timeWindow: number): void {
      purgeNow();
      answer(counters.hit(this.prefix + key, timeWindow), callback);
    }

    read(key: string, callback: Callback): void {
      answer(counters.peek(this.prefix + key), callback);
    }

    // A route limiter carries routeInfo; app.createRateLimit has none and names its own keys.
    child(options: ChildOptions): FastifyRateLimitStore {
      const route = (options as { routeInfo?: RouteInfo }).routeInfo ?? options;
      const { method, url } = route;
      const scope = typeof method === "string" && typeof url === "string" ? `${method}${url}:` : "";
      return new CounterRateLimitStore(options, `${this.prefix}${scope}`);
    }
  };
}
