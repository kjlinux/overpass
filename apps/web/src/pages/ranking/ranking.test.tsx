import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { CountryTable, DeveloperTable } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/ranking", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

describe("ranking tables", () => {
  it("shows each country with its self-hosted flag and its name", () => {
    const html = page(
      <CountryTable rows={[{ rank: 1, country: "CI", points: 20, developers: 2 }]} />,
    );
    expect(html).toContain('src="/flags/ci.svg"');
    expect(html).toMatch(/<img[^>]*\salt(="")?[\s/>]/);
    expect(html).toContain("Côte d’Ivoire");
    expect(html).toContain(">20<");
  });

  it("links each developer to the public profile", () => {
    const html = page(
      <DeveloperTable rows={[{ rank: 1, handle: "awa", country: "SN", points: 12 }]} />,
    );
    expect(html).toContain('href="/fr/members/awa"');
    expect(html).toContain("Sénégal");
  });
});
