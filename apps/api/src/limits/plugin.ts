import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { CounterStore } from "./counters.js";
import { counterStoreFor } from "./fastify-store.js";

export type RouteLimit = { max: number; timeWindow: number };

/** Per-IP budget of any route that declares none, so no route is left unbounded. */
export const defaultRouteLimit: RouteLimit = { max: 600, timeWindow: 60_000 };

/** Registers the shared PostgreSQL counters; a route's own rateLimit config takes precedence. */
export async function registerRateLimits(
  app: FastifyInstance,
  counters: CounterStore,
  fallback: RouteLimit = defaultRouteLimit,
): Promise<void> {
  // A failing counter store must not take the API down; every route needs the same database anyway.
  const store = counterStoreFor(counters);
  await app.register(rateLimit, { global: true, ...fallback, store, skipOnError: true });
}
