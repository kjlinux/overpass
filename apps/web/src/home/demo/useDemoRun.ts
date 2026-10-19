import type { SandboxEvent } from "@overpass/shared";
import { useCallback, useRef, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { settled } from "./stages";
import { usePoll } from "./usePoll";

export type Timings = { response?: number; webhook?: number };

/** One real demo payment: POST /v1/sandbox/demo, then follow the event until the webhook lands. */
export function useDemoRun() {
  const [event, setEvent] = useState<SandboxEvent>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timings, setTimings] = useState<Timings>({});
  const startedAt = useRef(0);
  const since = (): number => performance.now() - startedAt.current;
  const onEvent = useCallback((next: SandboxEvent) => {
    setEvent(next);
    if (settled(next)) setTimings((now) => ({ ...now, webhook: now.webhook ?? since() }));
  }, []);
  usePoll(event?.id, onEvent);
  const start = async (): Promise<void> => {
    startedAt.current = performance.now();
    setEvent(undefined);
    setTimings({});
    setFailed(false);
    setBusy(true);
    const { data } = await apiRequest<SandboxEvent>("POST", "/v1/sandbox/demo", {
      scenario: "success",
    });
    setBusy(false);
    setFailed(data === null);
    if (data === null) return;
    setTimings({ response: since() });
    setEvent(data);
  };
  return { event, busy, failed, timings, start };
}
