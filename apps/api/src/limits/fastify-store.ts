import type { FastifyRateLimitOptions, FastifyRateLimitStore } from "@fastify/rate-limit";
import type { CounterStore } from "./counters.js";

type Callback = (error: Error | null, result?: { current: number; ttl: number }) => void;
type ChildOptions = Parameters<FastifyRateLimitStore["child"]>[0];
type RouteInfo = { method: unknown; url: unknown };

const purgeEveryMs = 60_000;

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
      private readonly prefix = "rl:",
    ) {}

    incr(key: string, callback: Callback, timeWindow: number): void {
      purgeNow();
      counters.hit(this.prefix + key, timeWindow).then(
        ({ count, ttlMs }) => {
          callback(null, { current: count, ttl: ttlMs });
        },
        (error: unknown) => {
          callback(error instanceof Error ? error : new Error(String(error)));
        },
      );
    }

    read(key: string, callback: Callback): void {
      counters.peek(this.prefix + key).then(
        ({ count, ttlMs }) => {
          callback(null, { current: count, ttl: ttlMs });
        },
        (error: unknown) => {
          callback(error instanceof Error ? error : new Error(String(error)));
        },
      );
    }

    // The plugin passes its merged settings with routeInfo, not the declared route options.
    child(options: ChildOptions): FastifyRateLimitStore {
      const route = (options as { routeInfo?: RouteInfo }).routeInfo ?? options;
      const scope = `${String(route.method)}${String(route.url)}`;
      return new CounterRateLimitStore(
        options as FastifyRateLimitOptions,
        `${this.prefix}${scope}:`,
      );
    }
  };
}
