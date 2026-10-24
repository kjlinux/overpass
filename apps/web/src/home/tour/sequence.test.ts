import { describe, expect, it } from "vitest";
import { nextTick, stepOf } from "./sequence";

describe("a looping screen sequence", () => {
  it("shows one more step per tick, then holds on the full screen", () => {
    expect([0, 1, 2, 3, 4, 5].map((tick) => stepOf(tick, 3))).toEqual([0, 1, 2, 3, 3, 3]);
  });

  it("starts over once the hold is over", () => {
    expect(nextTick(2, 3, 2)).toBe(3);
    expect(nextTick(4, 3, 2)).toBe(5);
    expect(nextTick(5, 3, 2)).toBe(0);
  });
});
