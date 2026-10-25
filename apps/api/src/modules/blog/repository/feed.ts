import { blogRules } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { DateCursor } from "../../../http/date-cursor.js";
import type { FeedCursor, FeedFilters, FeedPart, FeedRow } from "../model.js";
import { at, fromPosts, listed, postColumns, posts, rows, toPost } from "./sql.js";

const day = 86_400_000;

function preferred(language: FeedFilters["preferredLanguage"], now: Date): SQL | undefined {
  if (language === undefined) return undefined;
  return sql`(p.language = ${language} or not exists (select 1 from posts t
    where t.translation_group = p.translation_group and t.language = ${language}
    and ${listed("t", at(now))}))`;
}

function filtersOf(filters: FeedFilters): SQL {
  const parts = [
    listed("p", at(filters.now)),
    filters.category === undefined ? undefined : sql`p.category = ${filters.category}`,
    filters.language === undefined ? undefined : sql`p.language = ${filters.language}`,
    preferred(filters.preferredLanguage, filters.now),
    filters.authorId === undefined ? undefined : sql`p.author_id = ${filters.authorId}`,
    filters.newsOnly === true ? sql`p.kind = 'news'` : undefined,
  ].filter((part) => part !== undefined);
  return sql.join(parts, sql` and `);
}

const followedBy = (viewerId: string) =>
  sql`p.author_id in (select followee_id from follows where follower_id = ${viewerId})`;

/** Followed authors, newest first; skipped once the cursor has reached the second tier. */
function followedBranch(filters: FeedFilters, viewerId: string | null, after?: FeedCursor): SQL {
  const active = viewerId === null || after?.tier === 1 ? sql`false` : followedBy(viewerId);
  const page =
    after === undefined ? sql`true` : sql`(p.published_at, p.id) < (${at(after.at)}, ${after.id})`;
  return sql`select ${postColumns(false)}, 0 as tier, 0 as rank ${fromPosts}
    where ${active} and ${filtersOf(filters)} and ${page}
    order by p.published_at desc, p.id desc limit ${filters.limit + 1}`;
}

/** Recent posts of everyone else, the most starred first. */
function topRatedBranch(filters: FeedFilters, viewerId: string | null, after?: FeedCursor): SQL {
  const since = new Date(filters.now.getTime() - blogRules.recentDays * day);
  const others =
    viewerId === null ? sql`true` : sql`(p.author_id is null or not (${followedBy(viewerId)}))`;
  const page =
    after?.tier === 1
      ? sql`(p.star_count, p.published_at, p.id) < (${after.stars}, ${at(after.at)}, ${after.id})`
      : sql`true`;
  return sql`select ${postColumns(false)}, 1 as tier, p.star_count as rank ${fromPosts}
    where ${filtersOf(filters)} and p.published_at >= ${at(since)} and ${others} and ${page}
    order by p.star_count desc, p.published_at desc, p.id desc limit ${filters.limit + 1}`;
}

/** Each branch walks its own index; only the two short pages are merged and sorted. */
async function forMe(
  db: Database,
  filters: FeedFilters,
  viewerId: string | null,
  after?: FeedCursor,
): Promise<FeedRow[]> {
  const query = sql`select * from ((${followedBranch(filters, viewerId, after)})
      union all (${topRatedBranch(filters, viewerId, after)})) feed
    order by tier, rank desc, "publishedAt" desc, id desc limit ${filters.limit + 1}`;
  const raw = await rows<Parameters<typeof toPost>[0] & { tier: number }>(db, query);
  return raw.map((row) => ({ ...toPost(row), tier: row.tier === 0 ? 0 : 1 }));
}

function recent(db: Database, filters: FeedFilters, after?: DateCursor) {
  const page =
    after === undefined ? sql`true` : sql`(p.published_at, p.id) < (${at(after.at)}, ${after.id})`;
  return posts(
    db,
    sql`select ${postColumns(false)} ${fromPosts} where ${filtersOf(filters)} and ${page}
      order by p.published_at desc, p.id desc limit ${filters.limit + 1}`,
  );
}

export function feedQueries(db: Database): FeedPart {
  return {
    recent: (filters, after) => recent(db, filters, after),
    forMe: (filters, viewerId, after) => forMe(db, filters, viewerId, after),
    related: (post, now, limit) =>
      posts(
        db,
        sql`select ${postColumns(false)} ${fromPosts}
          where ${listed("p", at(now))} and p.id <> ${post.id} and p.language = ${post.language}
          order by (p.category = ${post.category}) desc, p.published_at desc, p.id desc
          limit ${limit}`,
      ),
  };
}
