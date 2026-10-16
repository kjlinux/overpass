import { describe, expect, it } from "vitest";
import { freshnessOf } from "./freshness.js";

const now = new Date("2026-10-16T12:00:00Z");

describe("freshnessOf", () => {
  it("reports a broken route first, whatever its last check", () => {
    expect(freshnessOf({ state: "broken", lastCheckAt: "2026-10-15T00:00:00Z" }, now)).toBe(
      "broken",
    );
  });

  it("reports a route nobody has checked", () => {
    expect(freshnessOf({ state: "to_verify", lastCheckAt: null }, now)).toBe("never_checked");
  });

  it("reports a route whose last check is older than the freshness window", () => {
    expect(freshnessOf({ state: "clear", lastCheckAt: "2026-07-17T11:00:00Z" }, now)).toBe("stale");
  });

  it("reports a route checked inside the window as fresh", () => {
    expect(freshnessOf({ state: "clear", lastCheckAt: "2026-07-18T13:00:00Z" }, now)).toBe("fresh");
  });
});
