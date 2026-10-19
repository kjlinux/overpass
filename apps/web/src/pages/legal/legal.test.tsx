import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { LegalPage, PrivacyPage } from "./index";
import { licenceReport, parseLicenceReport } from "./licenceReport";

async function page(language: "fr" | "en", Page: typeof LegalPage): Promise<string> {
  await setupTestI18n(language);
  vi.stubGlobal("location", new URL(`https://overpass.example/${language}/legal`));
  return render(
    <LocationProvider>
      <Page />
    </LocationProvider>,
  );
}

const sample = [
  "Packages audited: 3, direct and indirect, all platforms.",
  "| MIT | yes | 2 |",
  "| ISC | yes | 1 |",
  "- **MIT**: a@1.0.0 (dev), @scope/b@2.0.0",
  "- **ISC**: c@3.0.0",
].join("\n");

describe("licence report", () => {
  it("parses totals and packages, flagging development tools", () => {
    expect(parseLicenceReport(sample)).toEqual({
      audited: 3,
      groups: [
        {
          licence: "MIT",
          count: 2,
          packages: [
            { name: "a@1.0.0", dev: true },
            { name: "@scope/b@2.0.0", dev: false },
          ],
        },
        { licence: "ISC", count: 1, packages: [{ name: "c@3.0.0", dev: false }] },
      ],
    });
  });

  it("reads docs/LICENSES.md at build time, every group with its listed packages", () => {
    expect(licenceReport.audited).toBeGreaterThan(0);
    expect(licenceReport.groups.length).toBeGreaterThan(0);
    for (const group of licenceReport.groups) expect(group.packages).toHaveLength(group.count);
  });
});

describe("legal notice", () => {
  it("names the publisher and leaves unknown fields as explicit placeholders", async () => {
    const html = await page("fr", LegalPage);
    expect(html).toContain("Jude Koffi et Bradi");
    expect(html.match(/À compléter par l(&#39;|')équipe/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain("preact@");
    expect(html).toContain('id="licences"');
  });

  it("states the MIT licence of the code and its holders", async () => {
    const html = await page("fr", LegalPage);
    expect(html).toContain("MIT, Ghostapi (Jude Koffi et Bradi)");
    expect(html).toContain('href="https://github.com/kjlinux/overpass/blob/main/LICENSE"');
  });

  it("renders in English", async () => {
    const html = await page("en", LegalPage);
    expect(html).toContain("Legal notice");
    expect(html).toContain("To be completed by the team");
  });
});

describe("privacy page", () => {
  it("lists stored data, the session cookie and links to self-service deletion", async () => {
    const html = await page("fr", PrivacyPage);
    expect(html).toContain("__Host-overpass_session");
    expect(html).toContain("overpass.language");
    expect(html).toContain("après 7 jours");
    expect(html).toContain('href="/fr/settings#account"');
  });

  it("renders in English", async () => {
    const html = await page("en", PrivacyPage);
    expect(html).toContain("Stored data");
    expect(html).toContain('href="/en/settings#account"');
  });
});
