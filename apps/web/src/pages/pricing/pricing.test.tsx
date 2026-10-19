import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { PricingPage } from "./index";

async function page(language: "fr" | "en"): Promise<string> {
  await setupTestI18n(language);
  vi.stubGlobal("location", new URL(`https://overpass.example/${language}/pricing`));
  return render(
    <LocationProvider>
      <PricingPage />
    </LocationProvider>,
  );
}

describe("pricing page", () => {
  it("shows the free, team and enterprise plans in French with payment marked as coming", async () => {
    const html = await page("fr");
    expect(html).toContain("<h1");
    for (const plan of ["Gratuit", "Équipe", "Entreprise"]) expect(html).toContain(plan);
    expect(html).toContain("Paiement en ligne : bientôt.");
    expect(html.match(/>Bientôt</g)).toHaveLength(2);
  });

  it("has a single primary action, to the sign-up page, and no price figure", async () => {
    const html = await page("fr");
    expect(html.match(/bg-accent /g)).toHaveLength(1);
    expect(html).toContain('href="/fr/sign-up"');
    expect(html).not.toMatch(/\d+\s?(€|\$|FCFA|XOF)/);
  });

  it("renders in English", async () => {
    const html = await page("en");
    expect(html).toContain("Online payment: coming soon.");
    expect(html).toContain('href="/en/sign-up"');
    expect(html).toContain("Enterprise");
  });
});
