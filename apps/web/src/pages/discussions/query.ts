import { threadStates, topicSlugs } from "@overpass/shared";
import type { ThreadState, TopicSlug } from "@overpass/shared";

export type ThreadQuery = {
  topic?: TopicSlug;
  country?: string;
  stack?: string;
  language?: string;
  state?: ThreadState;
};

const keys = ["topic", "country", "stack", "language", "state"] as const;

const pick = <T extends string>(values: readonly T[], value: string) =>
  values.find((candidate) => candidate === value);

/** Reads the known filters from a query string; the API validates the free values. */
export function threadQueryFrom(search: string): ThreadQuery {
  const params = new URLSearchParams(search);
  const query: ThreadQuery = {};
  for (const key of keys) {
    const value = params.get(key)?.trim() ?? "";
    if (value === "") continue;
    if (key === "topic") {
      const topic = pick(topicSlugs, value);
      if (topic !== undefined) query.topic = topic;
    } else if (key === "state") {
      const state = pick(threadStates, value);
      if (state !== undefined) query.state = state;
    } else query[key] = value;
  }
  return query;
}

/** Writes the filters back as a query string, in a stable order. */
export function threadSearch(query: ThreadQuery, cursor?: string): string {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = query[key];
    if (value !== undefined && value !== "") params.set(key, value);
  }
  if (cursor !== undefined) params.set("cursor", cursor);
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}
