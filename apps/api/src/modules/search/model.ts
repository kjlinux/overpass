import type { Language, SearchHit, SearchKind } from "@overpass/shared";

/** Where the next page starts: the score and id of the last hit, ties broken by id. */
export type ScoreCursor = { score: number; id: string };

export type KindFilters = {
  q: string;
  /** The interface language, whose hits rank first at equal relevance. */
  lang: Language;
  language?: Language | undefined;
  category?: string | undefined;
  after?: ScoreCursor | undefined;
  limit: number;
  now: Date;
};

export type ScoredHit = SearchHit & { score: number };

export type KindSearch = (filters: KindFilters) => Promise<ScoredHit[]>;

export type SearchRepository = Record<SearchKind, KindSearch>;
