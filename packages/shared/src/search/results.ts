import type { Language } from "../i18n/languages.js";
import type { SearchKind } from "./inputs.js";

export type SearchHit = {
  kind: SearchKind;
  id: string;
  /** The blog slug, so the web links an article without a second lookup. */
  slug: string | null;
  title: string;
  snippet: string;
  language: Language;
  category: string | null;
  at: string;
};

export type SearchGroup = { items: SearchHit[]; nextCursor: string | null };
export type SearchResults = Record<SearchKind, SearchGroup>;

export type HighlightPart = { text: string; hit: boolean };

// Control characters, which no title or Markdown text carries, mark the words that matched.
export const highlightStart = String.fromCharCode(2);
export const highlightStop = String.fromCharCode(3);

/** Plain text parts only, so a snippet is rendered as text and never as markup. */
export function splitHighlights(snippet: string): HighlightPart[] {
  const [head = "", ...chunks] = snippet.split(highlightStart);
  const parts: HighlightPart[] = head === "" ? [] : [{ text: head, hit: false }];
  for (const chunk of chunks) {
    const stop = chunk.indexOf(highlightStop);
    const hit = stop === -1 ? chunk : chunk.slice(0, stop);
    const rest = stop === -1 ? "" : chunk.slice(stop + 1);
    if (hit !== "") parts.push({ text: hit, hit: true });
    if (rest !== "") parts.push({ text: rest, hit: false });
  }
  return parts;
}
