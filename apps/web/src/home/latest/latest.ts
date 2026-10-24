import { postPageSchema, routePageSchema, threadPageSchema } from "@overpass/shared";
import type { PostSummary, RouteSummary, ThreadSummary } from "@overpass/shared";

export type LatestKind = "routes" | "threads" | "posts";

export type ItemOf = { routes: RouteSummary; threads: ThreadSummary; posts: PostSummary };

export type LatestState<T> =
  { status: "loading" } | { status: "ready"; items: T[] } | { status: "error" };

export type LatestView<T> =
  { kind: "loading" } | { kind: "hidden" } | { kind: "shown"; items: T[] };

const shown = 3;

const schemas = { routes: routePageSchema, threads: threadPageSchema, posts: postPageSchema };

export const latestPaths: Record<LatestKind, string> = {
  routes: `/v1/routes?limit=${String(shown)}`,
  threads: `/v1/threads?limit=${String(shown)}`,
  posts: `/v1/posts?limit=${String(shown)}`,
};

/** Reads one list page against the shared contract; anything else is an error. */
export function parseLatest<K extends LatestKind>(kind: K, data: unknown): ItemOf[K][] | null {
  const parsed = schemas[kind].safeParse(data);
  return parsed.success ? (parsed.data.items as ItemOf[K][]) : null;
}

/** A failed or empty list hides its block: the home page never shows an error for it. */
export function latestView<T>(state: LatestState<T>): LatestView<T> {
  if (state.status === "loading") return { kind: "loading" };
  if (state.status === "error" || state.items.length === 0) return { kind: "hidden" };
  return { kind: "shown", items: state.items.slice(0, shown) };
}
