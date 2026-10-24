export function stepOf(tick: number, steps: number): number {
  return Math.min(tick, steps);
}

/** The screen stays fully drawn while it holds after the last step, then plays again from the start. */
export function nextTick(tick: number, steps: number, hold: number): number {
  return tick >= steps + hold ? 0 : tick + 1;
}
