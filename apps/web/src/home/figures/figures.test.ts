import { describe, expect, it } from "vitest";
import { placeCountries } from "./places";
import { countAt, formatCount, parseStats } from "./stats";
import { statsView } from "./view";

describe("parseStats", () => {
  const body = {
    routes: 12,
    checks: 40,
    countries: ["BF", "CI"],
    updatedAt: "2026-10-16T12:00:00.000Z",
  };

  it("accepts the shape of GET /v1/stats", () => {
    expect(parseStats(body)).toEqual(body);
  });

  it("rejects fractional or missing figures, as the shared contract does", () => {
    expect(parseStats({ ...body, checks: 1.5 })).toBeNull();
    expect(parseStats({ ...body, countries: "CI" })).toBeNull();
    expect(parseStats({ checks: 1 })).toBeNull();
    expect(parseStats(null)).toBeNull();
  });
});

describe("formatCount and countAt", () => {
  it("groups thousands in the reader's language", () => {
    expect(formatCount(12345, "en")).toBe("12,345");
    expect(formatCount(12345, "fr").replace(/\D/g, " ")).toBe("12 345");
  });

  it("rises from zero to the exact target, never past it", () => {
    expect(countAt(250, 0)).toBe(0);
    expect(countAt(250, 0.5)).toBeLessThan(250);
    expect(countAt(250, 1)).toBe(250);
    expect(countAt(250, 1.2)).toBe(250);
  });
});

describe("placeCountries", () => {
  it("puts known countries at their approximate place on the nine-column grid", () => {
    expect(placeCountries(["CI", "SN"])).toEqual([
      { code: "SN", column: 2, row: 1 },
      { code: "CI", column: 3, row: 4 },
    ]);
  });

  it("lines up unknown codes on extra rows after the map, nine per row", () => {
    const placed = placeCountries(["ZZ", "CI"]);
    expect(placed.at(-1)).toEqual({ code: "ZZ", column: 1, row: 7 });
  });
});

describe("statsView", () => {
  const stats = { routes: 3, checks: 5, countries: ["CI"], updatedAt: "2026-10-17T00:00:00.000Z" };

  it("keeps the skeleton while the figures load", () => {
    expect(statsView({ status: "loading" })).toEqual({ kind: "loading" });
  });

  it("hides the section when the API fails or answers off-contract", () => {
    expect(statsView({ status: "error" })).toEqual({ kind: "hidden" });
  });

  it("hides the section when the database is still empty", () => {
    const empty = { ...stats, routes: 0, checks: 0, countries: [] };
    expect(statsView({ status: "ready", stats: empty })).toEqual({ kind: "hidden" });
  });

  it("shows the tiles only when countries are present", () => {
    expect(statsView({ status: "ready", stats })).toEqual({ kind: "shown", stats, tiles: true });
    const none = { ...stats, countries: [] };
    expect(statsView({ status: "ready", stats: none })).toEqual({
      kind: "shown",
      stats: none,
      tiles: false,
    });
  });
});
