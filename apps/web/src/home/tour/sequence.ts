export function stepOf(tick: number, steps: number): number {
  return Math.min(tick, steps);
}

/** After the last step the screen holds for a few ticks, then plays again from the start. */
export function nextTick(tick: number, steps: number, hold: number): number {
  return tick >= steps + hold ? 0 : tick + 1;
}
