import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { AboutPage } from "./index";

async function page(language: "fr" | "en"): Promise<string> {
  await setupTestI18n(language);
  vi.stubGlobal("location", new URL(`https://overpass.example/${language}/about`));
  return render(
    <LocationProvider>
      <AboutPage />
    </LocationProvider>,
  );
}

describe("about page", () => {
  it("names the Ghostapi team and its two members, without a photo", async () => {
    const html = await page("fr");
    expect(html).toContain("Ghostapi");
    expect(html).toContain("Jude Koffi");
    expect(html).toContain("Bradi");
    expect(html).not.toContain("<img");
  });

  it("links the contest page, the repository and the component licences", async () => {
    const html = await page("fr");
    expect(html).toContain("https://systalink.com/fr/coupe-afrique-des-developpeurs-cadev");
    expect(html).toContain("https://github.com/kjlinux/overpass");
    expect(html).toContain('href="/fr/legal#licences"');
    expect(html).toMatch(/À compléter par l(&#39;|')équipe/);
  });

  it("renders in English with the demo as its one primary action", async () => {
    const html = await page("en");
    expect(html).toContain("The team");
    expect(html).toContain('href="/en/sandbox/demo"');
    expect(html.match(/bg-accent /g)).toHaveLength(1);
  });
});
