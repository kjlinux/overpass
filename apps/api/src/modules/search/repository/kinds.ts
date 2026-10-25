import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { textQuery } from "../../../db/search.js";
import { listedPostCondition } from "../../blog/index.js";
import { listedRouteCondition } from "../../routes/index.js";
import type { KindFilters, ScoredHit } from "../model.js";
import { pageOf, scoreOf, typoMatch } from "./sql.js";

const optional = (condition: SQL | false) => (condition === false ? sql`true` : condition);

export function searchPosts(db: Database, filters: KindFilters): Promise<ScoredHit[]> {
  const query = textQuery(filters.q);
  const score = scoreOf(sql`ts_rank(p.search, ${query})`, sql`p.title`, sql`p.language`, filters);
  const inner = sql`select p.id, p.slug, p.title, p.summary || ' ' || p.content as body,
      p.language, p.category, p.published_at as at, ${score} as score
    from posts p
    where ${listedPostCondition("p", sql`${filters.now.toISOString()}::timestamptz`)}
      and (p.search @@ ${query} or ${typoMatch(sql`p.title`, filters)})
      and ${optional(filters.language !== undefined && sql`p.language = ${filters.language}`)}
      and ${optional(filters.category !== undefined && sql`p.category = ${filters.category}`)}`;
  return pageOf(db, "posts", inner, filters, query);
}

/** A thread also answers for its visible replies; the best one gives the snippet when needed. */
export function searchThreads(db: Database, filters: KindFilters): Promise<ScoredHit[]> {
  const query = textQuery(filters.q);
  const bestReply = sql`(select r.content from replies r
    where r.thread_id = t.id and r.status = 'visible' and r.search @@ ${query}
    order by ts_rank(r.search, ${query}) desc limit 1)`;
  const replyRank = sql`coalesce((select max(ts_rank(r.search, ${query})) from replies r
    where r.thread_id = t.id and r.status = 'visible' and r.search @@ ${query}), 0)`;
  const rank = sql`(ts_rank(t.search, ${query}) + 0.5 * ${replyRank})`;
  const score = scoreOf(rank, sql`t.title`, sql`t.language`, filters);
  const inner = sql`select t.id, null::text as slug, t.title,
      case when t.search @@ ${query} then t.content else coalesce(${bestReply}, t.content) end as body,
      t.language, t.topic as category, t.last_activity_at as at, ${score} as score
    from threads t
    where t.status = 'visible'
      and (t.search @@ ${query} or ${replyRank} > 0 or ${typoMatch(sql`t.title`, filters)})
      and ${optional(filters.language !== undefined && sql`t.language = ${filters.language}`)}
      and ${optional(filters.category !== undefined && sql`t.topic = ${filters.category}`)}`;
  return pageOf(db, "threads", inner, filters, query);
}

/** Itineraries have no category of their own, so a category filter leaves this kind empty. */
export function searchRoutes(db: Database, filters: KindFilters): Promise<ScoredHit[]> {
  if (filters.category !== undefined) return Promise.resolve([]);
  const query = textQuery(filters.q);
  const score = scoreOf(sql`ts_rank(r.search, ${query})`, sql`r.title`, sql`r.language`, filters);
  const inner = sql`select r.id, null::text as slug, r.title, r.content as body,
      r.language, null::text as category, r.updated_at as at, ${score} as score
    from routes r
    where ${listedRouteCondition("r")}
      and (r.search @@ ${query} or ${typoMatch(sql`r.title`, filters)})
      and ${optional(filters.language !== undefined && sql`r.language = ${filters.language}`)}`;
  return pageOf(db, "routes", inner, filters, query);
}
