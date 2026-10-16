import { describe, expect, it } from "vitest";
import { pointRules, pointsFor } from "../index.js";

const none = { routes: 0, checks: 0, potholes: 0, accepted: 0, useful: 0, articles: 0 };

describe("pointsFor", () => {
  it("is zero without any contribution", () => {
    expect(pointsFor(none)).toBe(0);
  });

  it.each([
    ["routes", 10],
    ["checks", 2],
    ["potholes", 5],
    ["accepted", 5],
    ["useful", 1],
    ["articles", 10],
  ] as const)("gives the specified weight to one %s", (source, weight) => {
    expect(pointsFor({ ...none, [source]: 1 })).toBe(weight);
    expect(pointRules[source]).toBe(weight);
  });

  it("adds every source", () => {
    const all = { routes: 2, checks: 3, potholes: 1, accepted: 2, useful: 4, articles: 1 };
    expect(pointsFor(all)).toBe(20 + 6 + 5 + 10 + 4 + 10);
  });
});
