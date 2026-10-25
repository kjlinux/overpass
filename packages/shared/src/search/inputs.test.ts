import { describe, expect, it } from "vitest";
import { searchQuery, splitHighlights } from "../index.js";

describe("searchQuery", () => {
  it("keeps a trimmed query, the interface language and five hits per kind by default", () => {
    expect(searchQuery.parse({ q: "  wave  ", lang: "en" })).toEqual({
      q: "wave",
      lang: "en",
      limit: 5,
    });
  });

  it("refuses a query under two characters and an unknown kind", () => {
    expect(searchQuery.safeParse({ q: "a" }).success).toBe(false);
    expect(searchQuery.safeParse({ q: "wave", kind: "users" }).success).toBe(false);
  });

  it("accepts one kind with its category, language and cursor", () => {
    const parsed = searchQuery.parse({ q: "wave", kind: "posts", category: "tutorials" });
    expect(parsed).toMatchObject({ kind: "posts", category: "tutorials", lang: "fr" });
  });
});

describe("splitHighlights", () => {
  it("cuts a snippet into plain and highlighted parts, never into markup", () => {
    const start = String.fromCharCode(2);
    const stop = String.fromCharCode(3);
    expect(splitHighlights(`Payer avec ${start}Wave${stop} <b>vite</b>`)).toEqual([
      { text: "Payer avec ", hit: false },
      { text: "Wave", hit: true },
      { text: " <b>vite</b>", hit: false },
    ]);
  });
});
