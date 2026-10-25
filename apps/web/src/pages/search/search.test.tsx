import { highlightStart, highlightStop } from "@overpass/shared";
import type { SearchHit } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { DialogResults } from "./DialogResults";
import { HitContent } from "./HitContent";
import { KindSection } from "./KindSection";
import fr from "./locales/fr.json";
import { SearchFilters } from "./SearchFilters";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/search", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

const hit: SearchHit = {
  kind: "posts",
  id: "00000000-0000-4000-8000-000000000001",
  slug: "collect-with-wave",
  title: "Collecting payments with Wave",
  snippet: `Pay with ${highlightStart}Wave${highlightStop} <img src=x onerror=alert(1)>`,
  language: "en",
  category: "tutorials",
  at: "2026-10-14T12:00:00.000Z",
};

const list = { listId: "s", active: 0, language: "fr" as const, onPick: () => undefined };

describe("search hits", () => {
  it("marks the matched words and renders the rest of the snippet as text", () => {
    const html = page(<HitContent hit={hit} />);
    expect(html).toContain("<mark");
    expect(html).toContain("&lt;img src=x onerror=alert(1)>");
    expect(html).not.toContain("<img");
    expect(html).toContain("English");
  });
});

describe("search dialog results", () => {
  it("guides before typing and says when nothing matches", () => {
    expect(page(<DialogResults {...list} preview={{ status: "idle" }} q="" />)).toContain(
      fr.dialog.hint,
    );
    const empty = page(
      <DialogResults {...list} preview={{ status: "ready", groups: {} }} q="zz" />,
    );
    expect(empty).toContain("Aucun résultat pour « zz ».");
  });

  it("lists hits as options grouped by kind, the active one selected", () => {
    const groups = { posts: { items: [hit], nextCursor: null } };
    const html = page(<DialogResults {...list} preview={{ status: "ready", groups }} q="wave" />);
    expect(html).toContain('role="listbox"');
    expect(html).toContain('id="s-option-0" role="option" aria-selected="true"');
    expect(html).toContain(fr.kinds.posts);
    expect(html).toContain('href="/fr/blog/collect-with-wave"');
  });
});

describe("search page", () => {
  it("offers more results only while a cursor remains", () => {
    const params = { q: "wave" };
    const more = { kind: "posts" as const, params, language: "fr" as const };
    expect(page(<KindSection {...more} first={{ items: [hit], nextCursor: "c" }} />)).toContain(
      fr.page.more,
    );
    expect(
      page(<KindSection {...more} first={{ items: [hit], nextCursor: null }} />),
    ).not.toContain(fr.page.more);
  });

  it("keeps the category list closed until articles or discussions are chosen", () => {
    const html = page(<SearchFilters params={{ q: "wave" }} onApply={() => undefined} />);
    expect(html).toContain(fr.filters.categoryHelp);
    expect(html).toMatch(/id="search-category"[^>]*disabled/);
  });
});
