import { describe, expect, it } from "vitest";
import { delayOf, firstState, nextState, shownText } from "./typing";

const phrases = ["ab", "xyz"];

describe("a typed promise", () => {
  it("starts on the first phrase in full, so the page never opens on an empty title", () => {
    const state = firstState();
    expect(shownText(state, phrases)).toBe("ab");
    expect(state.phase).toBe("holding");
  });

  it("erases the phrase one character at a time after the hold", () => {
    const erasing = nextState(firstState(), phrases);
    expect(erasing.phase).toBe("erasing");
    expect(shownText(erasing, phrases)).toBe("a");
    expect(shownText(nextState(erasing, phrases), phrases)).toBe("");
  });

  it("moves to the next phrase once the title is empty, then types it", () => {
    const empty = { index: 0, length: 0, phase: "erasing" as const };
    const next = nextState(empty, phrases);
    expect(next).toEqual({ index: 1, length: 0, phase: "typing" });
    expect(shownText(nextState(next, phrases), phrases)).toBe("x");
  });

  it("holds once a phrase is fully typed", () => {
    const typed = { index: 1, length: 2, phase: "typing" as const };
    expect(nextState(typed, phrases)).toEqual({ index: 1, length: 3, phase: "holding" });
  });

  it("keeps a full phrase on screen far longer than a typed letter", () => {
    const typing = { index: 1, length: 1, phase: "typing" as const };
    expect(delayOf(firstState())).toBeGreaterThan(delayOf(typing) * 20);
    expect(delayOf({ ...typing, length: 0 })).toBeGreaterThan(delayOf(typing));
  });

  it("loops back to the first phrase after the last", () => {
    const empty = { index: 1, length: 0, phase: "erasing" as const };
    expect(nextState(empty, phrases).index).toBe(0);
  });
});
