import type { SandboxEvent } from "@overpass/shared";
import { useEffect } from "preact/hooks";
import { apiRequest } from "../../session";
import { pollEvent } from "./poll";

const fetchEvent = async (id: string): Promise<SandboxEvent | null> =>
  (await apiRequest<SandboxEvent>("GET", `/v1/sandbox/demo/events/${id}`)).data;

/** Follows a demo event every second until its webhooks settle, for at most 90 polls. */
export function usePoll(id: string | undefined, onEvent: (event: SandboxEvent) => void): void {
  useEffect(() => {
    if (id === undefined) return undefined;
    return pollEvent({ id, fetchEvent, onEvent, intervalMs: 1000, limit: 90 });
  }, [id, onEvent]);
}
