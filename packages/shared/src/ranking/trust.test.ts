import { describe, expect, it } from "vitest";
import { isConfirmed, reportWeight, trustRules, writeQuota } from "../index.js";

describe("isConfirmed", () => {
  it.each([
    [0, false],
    [19, false],
    [20, true],
    [21, true],
  ])("with %i points is %s", (points, confirmed) => {
    expect(isConfirmed(points)).toBe(confirmed);
  });

  it("starts at two published routes", () => {
    expect(trustRules.confirmedMinPoints).toBe(20);
  });
});

describe("reportWeight", () => {
  it("counts a confirmed member twice", () => {
    expect(reportWeight(true)).toBe(2);
    expect(reportWeight(false)).toBe(1);
  });
});

describe("writeQuota", () => {
  it("triples the base quota of a confirmed member", () => {
    expect(writeQuota(10, true)).toBe(30);
    expect(writeQuota(10, false)).toBe(10);
  });
});
