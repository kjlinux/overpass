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

    // The plugin passes its merged settings with routeInfo, not the declared route options.
    child(options: ChildOptions): FastifyRateLimitStore {
      const route = (options as { routeInfo?: RouteInfo }).routeInfo ?? options;
      const scope = `${String(route.method)}${String(route.url)}`;
      return new CounterRateLimitStore(options, `${this.prefix}${scope}:`);
    }
  };
}
