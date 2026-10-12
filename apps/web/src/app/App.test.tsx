import i18next from "i18next";
import { prerender } from "preact-iso";
import { initReactI18next } from "react-i18next";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import en from "../i18n/locales/en.json";
import fr from "../i18n/locales/fr.json";
import { App } from "./App";

beforeAll(async () => {
  await i18next.use(initReactI18next).init({
    lng: "fr",
    resources: { fr: { translation: fr }, en: { translation: en } },
  });
});

function renderAt(path: string) {
  vi.stubGlobal("location", new URL(path, "http://localhost"));
  return prerender(<App />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the home page under a language prefix", async () => {
    const { html } = await renderAt("/fr");
    expect(html).toContain(fr.app.tagline);
  });

  it("redirects an unknown page under a language", async () => {
    const { html } = await renderAt("/fr/nowhere");
    expect(html).toContain('aria-busy="true"');
  });

  it("shows the skeleton while redirecting an unknown prefix", async () => {
    const { html } = await renderAt("/de");
    expect(html).toContain('aria-busy="true"');
  });
});
