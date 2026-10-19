import type { Stats } from "@overpass/shared";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { Figures } from "./Figures";

const stats = (routes: number, checks: number, countries: string[]): Stats => ({
  routes,
  checks,
  countries,
  updatedAt: "2026-10-19T12:00:00.000Z",
});

describe("figures labels", () => {
  it("agree with a single itinerary and no check in French", async () => {
    await setupTestI18n("fr");
    const html = render(<Figures stats={stats(1, 0, ["CI", "SN"])} language="fr" />);
    expect(html).toContain("itinéraire publié<");
    expect(html).toContain("vérification datée<");
    expect(html).toContain("pays couverts<");
  });

  it("use the plural above one in English", async () => {
    await setupTestI18n("en");
    const html = render(<Figures stats={stats(2, 1, ["CI"])} language="en" />);
    expect(html).toContain("itineraries published<");
    expect(html).toContain("dated check<");
    expect(html).toContain("country covered<");
  });
});
