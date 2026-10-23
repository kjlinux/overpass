import { describe, expect, it } from "vitest";
import { africanCountries } from "./countries.js";
import { countryFacts, factsOf } from "./country-facts.js";

describe("countryFacts", () => {
  it("covers only African countries, each with a dialling code, a currency and a mobile length", () => {
    for (const [code, facts] of Object.entries(countryFacts)) {
      expect(africanCountries).toContain(code);
      expect(facts.dialling).toMatch(/^\+\d{1,3}$/);
      expect(facts.currency).toMatch(/^[A-Z]{3}$/);
      expect(facts.mobileDigits).toBeGreaterThanOrEqual(7);
      expect(facts.mobileDigits).toBeLessThanOrEqual(10);
    }
  });

  it("knows the numbering changes that break integrations", () => {
    expect(factsOf("CI")).toMatchObject({ dialling: "+225", currency: "XOF", mobileDigits: 10 });
    expect(factsOf("BJ")).toMatchObject({ dialling: "+229", currency: "XOF", mobileDigits: 10 });
    expect(factsOf("SN")).toMatchObject({ dialling: "+221", currency: "XOF", mobileDigits: 9 });
    expect(factsOf("NG")).toMatchObject({ dialling: "+234", currency: "NGN", mobileDigits: 10 });
  });

  it("gives zero decimals to the CFA francs and two to the others", () => {
    const cfa = Object.values(countryFacts).filter((facts) =>
      ["XOF", "XAF"].includes(facts.currency),
    );
    expect(cfa.length).toBeGreaterThan(10);
    expect(cfa.every((facts) => facts.decimals === 0)).toBe(true);
    expect(factsOf("KE")?.decimals).toBe(2);
    expect(factsOf("GN")?.decimals).toBe(0);
  });

  it("returns null for a country it does not know", () => {
    expect(factsOf("FR")).toBeNull();
  });
});
