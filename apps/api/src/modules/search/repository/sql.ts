import type { Language, SearchKind } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { configOf, headline, titleLikeness, typoThreshold } from "../../../db/search.js";
import type { KindFilters, ScoredHit } from "../model.js";

const readerLanguageBoost = sql.raw("1.5");
const typoWeight = sql.raw("0.1");

/** Full-text relevance, a little title likeness for typos, more for the reader's language. */
export function scoreOf(rank: SQL, title: SQL, language: SQL, filters: KindFilters): SQL {
  const likeness = titleLikeness(title, filters.q);
  return sql`round(((${rank} + ${typoWeight} * ${likeness})
    * (case when ${language} = ${filters.lang} then ${readerLanguageBoost} else 1.0 end))::numeric, 6)::float8`;
}

export function typoMatch(title: SQL, filters: KindFilters): SQL {
  return sql`${titleLikeness(title, filters.q)} >= ${typoThreshold}`;
}

type Row = {
  id: string;
  slug: string | null;
  title: string;
  snippet: string;
  language: Language;
  category: string | null;
  at: Date | string;
  score: number;
};

/**
 * Pages the inner query, which yields id, slug, title, body, language, category, at and score,
 * then builds snippets for the kept rows only.
 */
export async function pageOf(
  db: Database,
  kind: SearchKind,
  inner: SQL,
  filters: KindFilters,
  query: SQL,
): Promise<ScoredHit[]> {
  const after = filters.after;
  const page =
    after === undefined ? sql`true` : sql`(i.score, i.id) < (${after.score}, ${after.id}::uuid)`;
  const snippet = headline(configOf(sql`x.language`), sql`x.body`, query);
  const result: unknown = await db.execute(sql`select x.id, x.slug, x.title, x.language,
      x.category, x.at, x.score, ${snippet} as snippet
    from (select * from (${inner}) i where ${page}
      order by i.score desc, i.id desc limit ${filters.limit + 1}) x
    order by x.score desc, x.id desc`);
  return (result as { rows: Row[] }).rows.map((row) => ({
    ...row,
    kind,
    at: new Date(row.at).toISOString(),
  }));
}
