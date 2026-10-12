import { supportedLanguages } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../i18n/test-i18n";
import { Layout } from "./index";
import fr from "./locales/fr.json";
import { localizedPath, pathWithoutLanguage } from "./nav";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/routes", "http://localhost"));
});

function renderLayout(): string {
  return render(
    <LocationProvider>
      <Layout language="fr">
        <p>Contenu</p>
      </Layout>
    </LocationProvider>,
  );
}

describe("Layout", () => {
  it("offers a skip link, one option per language and the current page", () => {
    const html = renderLayout();
    expect(html).toContain(fr.skipToContent);
    expect(html.match(/<option/g)).toHaveLength(supportedLanguages.length * 2);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/fr/sandbox"');
  });

  it("keeps the newsletter form inactive and the footer links localized", () => {
    const html = renderLayout();
    expect(html).toContain("<fieldset disabled");
    expect(html).toContain(fr.newsletter.inactive);
    expect(html).toContain('href="/fr/privacy"');
    expect(html).toContain(fr.legalLine);
  });
});

describe("paths", () => {
  it("prefixes and strips the language segment", () => {
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("en", "/routes")).toBe("/en/routes");
    expect(pathWithoutLanguage("/fr/routes/1")).toBe("/routes/1");
    expect(pathWithoutLanguage("/fr")).toBe("/");
  });
});
