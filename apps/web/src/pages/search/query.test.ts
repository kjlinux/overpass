import { describe, expect, it } from "vitest";
import {
  hitHref,
  isSearchShortcut,
  nextActive,
  searchApiPath,
  searchPagePath,
  searchParamsFrom,
} from "./query";

describe("search query", () => {
  it("keeps known filters from the URL and drops the rest", () => {
    expect(searchParamsFrom("q=wave&kind=posts&language=en&category=tutorials&x=1")).toEqual({
      q: "wave",
      kind: "posts",
      language: "en",
      category: "tutorials",
    });
    expect(searchParamsFrom("q=%20&kind=users&language=xx")).toEqual({ q: "" });
  });

  it("builds the API path with the interface language and the page path without it", () => {
    expect(searchApiPath({ q: "wave", kind: "posts" }, "fr", { cursor: "abc", limit: 10 })).toBe(
      "/v1/search?q=wave&kind=posts&lang=fr&cursor=abc&limit=10",
    );
    expect(searchPagePath("en", { q: "mtn momo" })).toBe("/en/search?q=mtn+momo");
  });

  it("links each kind of hit to its own page", () => {
    const base = { id: "7", slug: null, title: "", snippet: "", category: null, at: "" };
    expect(hitHref({ ...base, kind: "posts", slug: "wave", language: "en" }, "fr")).toBe(
      "/fr/blog/wave",
    );
    expect(hitHref({ ...base, kind: "threads", language: "fr" }, "fr")).toBe("/fr/discussions/7");
    expect(hitHref({ ...base, kind: "routes", language: "fr" }, "en")).toBe("/en/routes/7");
  });
});

describe("keyboard", () => {
  const key = (value: string, extra: Partial<Parameters<typeof isSearchShortcut>[0]> = {}) => ({
    key: value,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    typing: false,
    ...extra,
  });

  it("opens on slash outside a field, and on Ctrl+K or Cmd+K anywhere", () => {
    expect(isSearchShortcut(key("/"))).toBe(true);
    expect(isSearchShortcut(key("/", { typing: true }))).toBe(false);
    expect(isSearchShortcut(key("k", { ctrlKey: true, typing: true }))).toBe(true);
    expect(isSearchShortcut(key("K", { metaKey: true }))).toBe(true);
    expect(isSearchShortcut(key("k"))).toBe(false);
  });

  it("moves through the options and wraps at both ends", () => {
    expect(nextActive(-1, 3, "ArrowDown")).toBe(0);
    expect(nextActive(2, 3, "ArrowDown")).toBe(0);
    expect(nextActive(0, 3, "ArrowUp")).toBe(2);
    expect(nextActive(1, 0, "ArrowDown")).toBe(-1);
    expect(nextActive(1, 3, "Enter")).toBe(1);
  });
});
