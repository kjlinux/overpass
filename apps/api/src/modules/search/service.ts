import { searchKinds } from "@overpass/shared";
import type { SearchGroup, SearchKind, SearchQuery } from "@overpass/shared";
import type { KindFilters, SearchRepository } from "./model.js";
import { decodeScoreCursor, encodeScoreCursor } from "./schemas.js";

export type SearchService = {
  search(query: SearchQuery): Promise<Partial<Record<SearchKind, SearchGroup>>>;
};

/** One kind pages with its cursor; without a kind, every kind returns its first page. */
export function createSearchService(repository: SearchRepository, now: () => Date): SearchService {
  async function group(kind: SearchKind, filters: KindFilters): Promise<SearchGroup> {
    const rows = await repository[kind](filters);
    const page = rows.slice(0, filters.limit);
    const last = page.at(-1);
    const more = rows.length > filters.limit && last !== undefined;
    return {
      items: page.map(({ kind: k, id, slug, title, snippet, language, category, at }) => ({
        kind: k,
        id,
        slug,
        title,
        snippet,
        language,
        category,
        at,
      })),
      nextCursor: more ? encodeScoreCursor({ score: last.score, id: last.id }) : null,
    };
  }
  return {
    async search(query) {
      const kinds = query.kind === undefined ? searchKinds : [query.kind];
      const filters: KindFilters = {
        q: query.q,
        lang: query.lang,
        language: query.language,
        category: query.category,
        after: query.kind === undefined ? undefined : decodeScoreCursor(query.cursor),
        limit: query.limit,
        now: now(),
      };
      const groups = await Promise.all(kinds.map((kind) => group(kind, filters)));
      return Object.fromEntries(kinds.map((kind, index) => [kind, groups[index]]));
    },
  };
}
