import type { Stats } from "@overpass/shared";
import type { StatsState } from "./useStats";

export type StatsView =
  { kind: "loading" } | { kind: "hidden" } | { kind: "shown"; stats: Stats; tiles: boolean };

/** A failed, off-contract or empty answer hides the section: the page never shows a broken figure. */
export function statsView(state: StatsState): StatsView {
  if (state.status === "loading") return { kind: "loading" };
  if (state.status === "error") return { kind: "hidden" };
  const { stats } = state;
  if (stats.routes === 0 && stats.checks === 0 && stats.countries.length === 0) {
    return { kind: "hidden" };
  }
  return { kind: "shown", stats, tiles: stats.countries.length > 0 };
}
