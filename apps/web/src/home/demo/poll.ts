import type { SandboxEvent } from "@overpass/shared";
import { settled } from "./stages";

export type PollOptions = {
  id: string;
  fetchEvent: (id: string) => Promise<SandboxEvent | null>;
  onEvent: (event: SandboxEvent) => void;
  intervalMs: number;
  limit: number;
};

/** Polls one demo event until it settles; answers that arrive after stop or for another id are dropped. */
export function pollEvent({ id, fetchEvent, onEvent, intervalMs, limit }: PollOptions): () => void {
  let polls = 0;
  let stopped = false;
  const stop = (): void => {
    stopped = true;
    clearInterval(timer);
  };
  const timer = setInterval(() => {
    polls += 1;
    if (polls >= limit) clearInterval(timer);
    void fetchEvent(id).then((event) => {
      if (stopped || event?.id !== id) return;
      onEvent(event);
      if (settled(event)) stop();
    });
  }, intervalMs);
  return stop;
}
