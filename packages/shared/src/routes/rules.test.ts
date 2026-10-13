import { describe, expect, it } from "vitest";
import { checkEligibility, nextCheckAt, routeRules, routeState } from "../index.js";

const day = 86_400_000;
const now = new Date("2026-10-13T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * day);

describe("routeState", () => {
  it("is clear with two distinct recent checkers", () => {
    expect(routeState({ recentCheckers: 2, unresolvedPotholes: 0 })).toBe("clear");
  });

  it("is to verify without any recent check", () => {
    expect(routeState({ recentCheckers: 0, unresolvedPotholes: 0 })).toBe("to_verify");
  });

  it("stays to verify with a single recent checker", () => {
    expect(routeState({ recentCheckers: 1, unresolvedPotholes: 0 })).toBe("to_verify");
  });

  it("is broken with two unresolved potholes, even when recently checked", () => {
    expect(routeState({ recentCheckers: 5, unresolvedPotholes: 2 })).toBe("broken");
  });

  it("is not broken with a single unresolved pothole", () => {
    expect(routeState({ recentCheckers: 2, unresolvedPotholes: 1 })).toBe("clear");
  });
});

describe("routeRules", () => {
  it("states the thresholds of the specification", () => {
    expect(routeRules).toEqual({
      clearMinCheckers: 2,
      freshnessDays: 90,
      brokenMinPotholes: 2,
      checkCooldownDays: 30,
    });
  });
});

describe("checkEligibility", () => {
  it("allows a first check by another account", () => {
    expect(checkEligibility({ isAuthor: false, lastCheckAt: null, now })).toBe("allowed");
  });

  it("refuses the author of the route", () => {
    expect(checkEligibility({ isAuthor: true, lastCheckAt: null, now })).toBe("own_route");
  });

  it("refuses a second check within 30 days", () => {
    const lastCheckAt = new Date(daysAgo(30).getTime() + 1000);
    expect(checkEligibility({ isAuthor: false, lastCheckAt, now })).toBe("too_soon");
  });

  it("allows a new check once 30 days have passed", () => {
    expect(checkEligibility({ isAuthor: false, lastCheckAt: daysAgo(30), now })).toBe("allowed");
  });
});

describe("nextCheckAt", () => {
  it("is 30 days after the last check", () => {
    expect(nextCheckAt(daysAgo(10)).toISOString()).toBe(
      new Date(now.getTime() + 20 * day).toISOString(),
    );
  });
});
