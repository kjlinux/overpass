import { routeStates } from "@overpass/shared";
import type { RouteState } from "@overpass/shared";

export type CatalogueQuery = {
  q?: string;
  service?: string;
  country?: string;
  stack?: string;
  language?: string;
  state?: RouteState;
};

const keys = ["q", "service", "country", "stack", "language", "state"] as const;

/** Reads the known filters from a query string; the API validates their values. */
export function queryFromSearch(search: string): CatalogueQuery {
  const params = new URLSearchParams(search);
  const query: CatalogueQuery = {};
  for (const key of keys) {
    const value = params.get(key)?.trim() ?? "";
    if (value === "") continue;
    if (key === "state") {
      const state = routeStates.find((candidate) => candidate === value);
      if (state !== undefined) query.state = state;
    } else query[key] = value;
  }
  return query;
}

/** Writes the filters back as a query string, in a stable order. */
export function searchFromQuery(query: CatalogueQuery, cursor?: string): string {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = query[key];
    if (value !== undefined && value !== "") params.set(key, value);
  }
  if (cursor !== undefined) params.set("cursor", cursor);
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}
