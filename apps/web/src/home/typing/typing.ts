export type TypingPhase = "typing" | "holding" | "erasing";
export type TypingState = { index: number; length: number; phase: TypingPhase };

const typeMs = 45;
const eraseMs = 25;
const holdMs = 2600;
const gapMs = 400;

/** The full first phrase, which is also what the prerendered page shows. */
export function firstState(): TypingState {
  return { index: 0, length: Number.MAX_SAFE_INTEGER, phase: "holding" };
}

export function shownText(state: TypingState, phrases: readonly string[]): string {
  return (phrases[state.index] ?? "").slice(0, state.length);
}

/** How long a state stays on screen before the next step. */
export function delayOf(state: TypingState): number {
  if (state.phase === "holding") return holdMs;
  if (state.phase === "erasing") return eraseMs;
  return state.length === 0 ? gapMs : typeMs;
}

/** One step of the loop: erase after the hold, then type the next phrase. */
export function nextState(state: TypingState, phrases: readonly string[]): TypingState {
  const full = (phrases[state.index] ?? "").length;
  const length = Math.min(state.length, full);
  if (state.phase === "holding") return { ...state, length: length - 1, phase: "erasing" };
  if (state.phase === "erasing") {
    if (length > 0) return { ...state, length: length - 1 };
    return { index: (state.index + 1) % Math.max(phrases.length, 1), length: 0, phase: "typing" };
  }
  if (length + 1 >= full) return { ...state, length: full, phase: "holding" };
  return { ...state, length: length + 1 };
}
