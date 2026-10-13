import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { summary, services } from "./fixtures";
import fr from "./locales/fr.json";
import {
  CatalogueFilters,
  CatalogueResults,
  RouteCard,
  queryFromSearch,
  searchFromQuery,
} from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/routes", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

describe("catalogue query in the URL", () => {
  it("reads only known filters and drops empty ones", () => {
    expect(queryFromSearch("?q=wave&country=CI&state=clear&evil=1&stack=")).toEqual({
      q: "wave",
      country: "CI",
      state: "clear",
    });
  });

  it("writes the filters back in a stable order", () => {
    expect(searchFromQuery({ state: "broken", q: "paiement webhook" })).toBe(
      "?q=paiement+webhook&state=broken",
    );
    expect(searchFromQuery({})).toBe("");
  });
});

describe("RouteCard", () => {
  it("shows the state, the service, the country, the stack and links to the detail", () => {
    const html = page(<RouteCard route={summary} />);
    expect(html).toContain("Voie libre");
    expect(html).toContain("Wave");
    expect(html).toContain("Côte d’Ivoire");
    expect(html).toContain("Laravel");
    expect(html).toContain(`href="/fr/routes/${summary.id}"`);
    expect(html).toContain("9 oct. 2026");
    expect(html).toContain("Français");
  });

  it("says when an itinerary was never checked", () => {
    const html = page(<RouteCard route={{ ...summary, state: "to_verify", lastCheckAt: null }} />);
    expect(html).toContain("À vérifier");
    expect(html).toContain(fr.card.neverChecked);
  });
});

describe("CatalogueFilters", () => {
  it("offers a labelled search and five filters, keyboard ready", () => {
    const html = page(
      <CatalogueFilters query={{ q: "wave" }} services={services} onApply={() => undefined} />,
    );
    expect(html).toContain('type="search"');
    expect(html).toContain('value="wave"');
    expect(html.match(/<select/g)).toHaveLength(5);
    expect(html).toContain(fr.filters.submit);
  });
});

describe("CatalogueResults", () => {
  it("lists the cards and offers the next page", () => {
    const html = page(
      <CatalogueResults page={{ items: [summary], nextCursor: "abc" }} onMore={() => undefined} />,
    );
    expect(html).toContain(summary.title);
    expect(html).toContain(fr.catalogue.more);
  });

  it("shows an empty state with the call to write the missing itinerary", () => {
    const html = page(
      <CatalogueResults page={{ items: [], nextCursor: null }} onMore={() => undefined} />,
    );
    expect(html).toContain(fr.catalogue.emptyTitle);
    expect(html).toContain('href="/fr/routes/new"');
  });
});
