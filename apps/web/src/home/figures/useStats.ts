import { useEffect, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { parseStats } from "./stats";
import type { Stats } from "@overpass/shared";

export type StatsState =
  { status: "loading" } | { status: "ready"; stats: Stats } | { status: "error" };

/** Reads the public figures once; a network error or an off-contract body both mean "error". */
export function useStats(): StatsState {
  const [state, setState] = useState<StatsState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    void apiRequest<unknown>("GET", "/v1/stats").then(({ data }) => {
      if (!live) return;
      const stats = parseStats(data);
      setState(stats === null ? { status: "error" } : { status: "ready", stats });
    });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
