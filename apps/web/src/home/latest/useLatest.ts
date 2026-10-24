import { useEffect, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { latestPaths, parseLatest } from "./latest";
import type { ItemOf, LatestKind, LatestState } from "./latest";

/** Reads the newest items of one list once, below the fold. */
export function useLatest<K extends LatestKind>(kind: K): LatestState<ItemOf[K]> {
  const [state, setState] = useState<LatestState<ItemOf[K]>>({ status: "loading" });
  useEffect(() => {
    let live = true;
    void apiRequest<unknown>("GET", latestPaths[kind]).then(({ data }) => {
      if (!live) return;
      const items = parseLatest(kind, data);
      setState(items === null ? { status: "error" } : { status: "ready", items });
    });
    return () => {
      live = false;
    };
  }, [kind]);
  return state;
}
