import { highlightStart, highlightStop } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

/** A query matched in every configuration of migration 0022, since a reader searches across languages. */
export function textQuery(q: string): SQL {
  return sql`(websearch_to_tsquery('overpass_french', ${q}) || websearch_to_tsquery('overpass_english', ${q}) || websearch_to_tsquery('overpass_simple', ${q}))`;
}

/** The configuration a row was indexed with, so a snippet stems the way the index did. */
export function configOf(language: SQL): SQL {
  return sql`(case ${language} when 'fr' then 'overpass_french'::regconfig when 'en' then 'overpass_english'::regconfig else 'overpass_simple'::regconfig end)`;
}

const options = `StartSel=${highlightStart}, StopSel=${highlightStop}, MaxWords=28, MinWords=10, MaxFragments=1`;

/** A short extract around the matched words; Markdown marks are dropped first. */
export function headline(config: SQL, text: SQL, query: SQL): SQL<string> {
  const plain = sql`regexp_replace(${text}, '[]#*_~>|[()]+', ' ', 'g')`;
  return sql<string>`ts_headline(${config}, ${plain}, ${query}, ${options})`;
}

/** A title close enough to the words typed, for a missing or an extra letter. */
export const typoThreshold = 0.4;

export function titleLikeness(title: SQL, q: string): SQL<number> {
  return sql<number>`word_similarity(lower(${q}), lower(${title}))`;
}
