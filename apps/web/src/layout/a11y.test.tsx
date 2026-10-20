import { readFileSync } from "node:fs";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../i18n/test-i18n";
import { closesMenu, Header } from "./Header";
import { shouldFocusMain } from "./routeFocus";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/routes", "http://localhost"));
});

describe("focus on client-side navigation", () => {
  it("leaves focus alone on the first page load", () => {
    expect(shouldFocusMain(undefined, "/fr/routes")).toBe(false);
  });

  it("moves focus to the main landmark when the pathname changes", () => {
    expect(shouldFocusMain("/fr", "/fr/routes")).toBe(true);
  });

  it("keeps focus when only the query or the hash changed", () => {
    expect(shouldFocusMain("/fr/routes", "/fr/routes")).toBe(false);
  });
});

describe("mobile menu", () => {
  it("closes on Escape only while open", () => {
    expect(closesMenu(true, "Escape")).toBe(true);
    expect(closesMenu(false, "Escape")).toBe(false);
    expect(closesMenu(true, "Enter")).toBe(false);
  });

  it("gives the toggle an id so Escape can return focus to it", () => {
    const html = render(
      <LocationProvider>
        <Header language="fr" />
      </LocationProvider>,
    );
    expect(html).toContain('id="site-nav-toggle"');
    expect(html).toContain('aria-controls="site-nav"');
  });
});

describe("reduced motion", () => {
  it("neutralises every animation, transition and smooth scroll", () => {
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toMatch(/\*,\s*::before,\s*::after\s*\{/);
    expect(block).toContain("animation-duration: 0.01ms !important");
    expect(block).toContain("transition-duration: 0.01ms !important");
    expect(block).toContain("scroll-behavior: auto !important");
  });
});
