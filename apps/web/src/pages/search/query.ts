import { searchKinds, supportedLanguages } from "@overpass/shared";
import type { Language, SearchHit, SearchKind } from "@overpass/shared";

export type SearchParams = {
  q: string;
  kind?: SearchKind | undefined;
  language?: Language | undefined;
  category?: string | undefined;
};

const isKind = (value: string | null): value is SearchKind =>
  (searchKinds as readonly (string | null)[]).includes(value);

const isLanguage = (value: string | null): value is Language =>
  (supportedLanguages as readonly (string | null)[]).includes(value);

const categoryPattern = /^[a-z][a-z-]{1,29}$/;

/** Unknown values are dropped, so a shared link never sends an invalid filter. */
export function searchParamsFrom(search: string): SearchParams {
  const params = new URLSearchParams(search);
  const kind = params.get("kind");
  const language = params.get("language");
  const category = params.get("category") ?? "";
  return {
    q: (params.get("q") ?? "").trim(),
    ...(isKind(kind) ? { kind } : {}),
    ...(isLanguage(language) ? { language } : {}),
    ...(categoryPattern.test(category) ? { category } : {}),
  };
}

function filterParams(params: SearchParams): URLSearchParams {
  const query = new URLSearchParams({ q: params.q });
  if (params.kind !== undefined) query.set("kind", params.kind);
  if (params.language !== undefined) query.set("language", params.language);
  if (params.category !== undefined) query.set("category", params.category);
  return query;
}

/** The interface language only ranks results; it never filters them. */
export function searchApiPath(
  params: SearchParams,
  lang: Language,
  page: { cursor?: string; limit?: number } = {},
): string {
  const query = filterParams(params);
  query.set("lang", lang);
  if (page.cursor !== undefined) query.set("cursor", page.cursor);
  if (page.limit !== undefined) query.set("limit", String(page.limit));
  return `/v1/search?${query.toString()}`;
}

export function searchPagePath(language: Language, params: SearchParams): string {
  return `/${language}/search?${filterParams(params).toString()}`;
}

const sections: Record<SearchKind, string> = {
  posts: "blog",
  threads: "discussions",
  routes: "routes",
};

export function hitHref(hit: SearchHit, language: Language): string {
  const segment = hit.kind === "posts" ? (hit.slug ?? hit.id) : hit.id;
  return `/${language}/${sections[hit.kind]}/${encodeURIComponent(segment)}`;
}

export type ShortcutKey = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** True while the focus sits in a field, where a slash is just a character. */
  typing: boolean;
};

export function isSearchShortcut(event: ShortcutKey): boolean {
  if (event.altKey) return false;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") return true;
  return event.key === "/" && !event.ctrlKey && !event.metaKey && !event.typing;
}

/** The option the arrows move to, wrapping at both ends; -1 when there is none. */
export function nextActive(current: number, count: number, key: string): number {
  if (count === 0) return -1;
  if (key === "ArrowDown") return (current + 1) % count;
  if (key === "ArrowUp") return current <= 0 ? count - 1 : current - 1;
  return current;
}
