import type { ApiError, QueueItem, QueueKind, QueueState } from "@overpass/shared";
import { useState } from "preact/hooks";
import { apiRequest } from "../../session";
import type { Decision } from "./decisions";
import { afterDecision, decisionRequest, queuePath } from "./decisions";
import { usePaged } from "./usePaged";

export type Pending = { item: QueueItem; decision: Decision };

/** The queue of one kind and state, plus the decision waiting for its confirmation. */
export function useQueue(kind: QueueKind, state: QueueState) {
  const paged = usePaged<QueueItem>(queuePath(kind, state));
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | undefined>(undefined);
  const [decided, setDecided] = useState(0);
  const ask = (next: Pending | null) => {
    setFailure(undefined);
    setPending(next);
  };
  const confirm = async (reason: string) => {
    if (pending === null) return;
    const { item, decision } = pending;
    const { path, body } = decisionRequest(item, decision, reason);
    setBusy(true);
    const { error } = await apiRequest("POST", path, body);
    setBusy(false);
    if (error !== null) {
      setFailure(error);
      return;
    }
    paged.update((items) => afterDecision(items, item, decision));
    setPending(null);
    setDecided((count) => count + 1);
  };
  return { ...paged, pending, busy, failure, decided, ask, confirm };
}
