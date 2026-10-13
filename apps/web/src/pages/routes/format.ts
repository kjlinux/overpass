import type { RouteState } from "@overpass/shared";
import type { RouteStatus } from "../../components/ui";

/** A short date in the reading language, in UTC so every reader sees the same day. */
export function formatDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const statuses: Record<RouteState, RouteStatus> = {
  clear: "clear",
  to_verify: "toVerify",
  broken: "broken",
};

/** The badge variant of a computed route state. */
export function statusOf(state: RouteState): RouteStatus {
  return statuses[state];
}
