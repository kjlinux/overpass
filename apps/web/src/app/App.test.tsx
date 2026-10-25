import { prerender } from "preact-iso";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../i18n/test-i18n";
import fr from "./locales/fr.json";
import errorsFr from "../pages/errors/locales/fr.json";
import showcaseFr from "../pages/showcase/locales/fr.json";
import { App } from "./App";

beforeAll(async () => {
  await setupTestI18n("fr");
});

function renderAt(path: string) {
  vi.stubGlobal("location", new URL(path, "http://localhost"));
  return prerender(<App />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the home page under a language prefix, inside the layout", async () => {
    const { html } = await renderAt("/fr");
    expect(html).toContain(fr.app.taglines[0]);
    expect(html).toContain('aria-label="Navigation principale"');
    expect(html).toContain("<footer");
  });

  it("renders the components page", async () => {
    const { html } = await renderAt("/fr/components");
    expect(html).toContain(showcaseFr.title);
  });

  it("shows the 404 page for an unknown path under a language", async () => {
    const { html } = await renderAt("/fr/nowhere");
    expect(html).toContain(errorsFr.notFound.title);
    expect(html).toContain('href="/fr"');
  });

  it("shows the skeleton while redirecting an unknown prefix", async () => {
    const { html } = await renderAt("/de");
    expect(html).toContain('aria-busy="true"');
  });
});
