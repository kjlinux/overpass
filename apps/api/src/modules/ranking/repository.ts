import type { CountryRank, DeveloperRank, PointsBreakdown } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import type { RankingRepository } from "./model.js";

async function rows<Row>(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

/** A published, visible post on an active blog earns points, scheduled ones included. */
const livePost = sql`p.status = 'published' and p.moderation = 'visible'
  and not exists (select 1 from blog_suspensions b where b.user_id = p.author_id)`;

/** Section 9: points come from the contribution tables; self-acceptance and self-votes earn nothing. */
function breakdownQuery(userId: string): SQL {
  return sql`select
    (select count(*)::int from routes where author_id = ${userId} and deleted_at is null) as routes,
    (select count(*)::int from checks where user_id = ${userId}) as checks,
    (select count(*)::int from potholes where user_id = ${userId} and status = 'confirmed') as potholes,
    (select count(*)::int from threads t join replies r on r.id = t.accepted_reply_id
      where r.author_id = ${userId} and r.status = 'visible' and t.status = 'visible'
        and t.author_id is distinct from r.author_id) as accepted,
    (select count(*)::int from reply_votes v join replies r on r.id = v.reply_id
      where r.author_id = ${userId} and r.status = 'visible' and v.user_id <> ${userId}) as useful,
    (select count(*)::int from posts p where p.author_id = ${userId} and ${livePost}) as articles,
    (select count(*)::int from post_stars s join posts p on p.id = s.post_id
      where p.author_id = ${userId} and ${livePost} and s.user_id <> ${userId}) as stars`;
}

function storeQuery(userId: string, b: PointsBreakdown, points: number, at: Date): SQL {
  return sql`insert into member_points
      (user_id, routes, checks, potholes, accepted, useful, articles, stars, points, updated_at)
    select ${userId}, ${b.routes}, ${b.checks}, ${b.potholes}, ${b.accepted}, ${b.useful},
      ${b.articles}, ${b.stars}, ${points}, ${at.toISOString()}
    where exists (select 1 from users where id = ${userId})
    on conflict (user_id) do update set routes = excluded.routes, checks = excluded.checks,
      potholes = excluded.potholes, accepted = excluded.accepted, useful = excluded.useful,
      articles = excluded.articles, stars = excluded.stars, points = excluded.points, updated_at = excluded.updated_at`;
}

function developersQuery(country: string | undefined, limit: number): SQL {
  const inCountry = country === undefined ? sql`` : sql`and u.country = ${country}`;
  return sql`select rank() over (order by mp.points desc)::int as rank, u.handle,
      trim(u.country) as country, mp.points
    from member_points mp join users u on u.id = mp.user_id
    where mp.points > 0 ${inCountry}
    order by mp.points desc, u.handle limit ${limit}`;
}

function countriesQuery(limit: number): SQL {
  return sql`select rank() over (order by sum(mp.points) desc)::int as rank,
      trim(u.country) as country, sum(mp.points)::int as points, count(*)::int as developers
    from member_points mp join users u on u.id = mp.user_id
    where mp.points > 0
    group by u.country order by points desc, country limit ${limit}`;
}

export function createRankingRepository(db: Database): RankingRepository {
  return {
    breakdown: async (userId) => {
      const [counts] = await rows<PointsBreakdown>(db, breakdownQuery(userId));
      if (counts === undefined) throw new Error("points breakdown returned nothing");
      return counts;
    },
    store: async (userId, breakdown, points, at) => {
      await db.execute(storeQuery(userId, breakdown, points, at));
    },
    cachedPoints: async (userId) => {
      const query = sql`select points from member_points where user_id = ${userId}`;
      const [entry] = await rows<{ points: number }>(db, query);
      return entry?.points ?? null;
    },
    voteRecipients: async (userId) => {
      const query = sql`select r.author_id as id from reply_votes v
          join replies r on r.id = v.reply_id where v.user_id = ${userId} and r.author_id is not null
        union select p.author_id from post_stars s
          join posts p on p.id = s.post_id where s.user_id = ${userId} and p.author_id is not null`;
      return (await rows<{ id: string }>(db, query)).map((row) => row.id);
    },
    countries: (limit) => rows<CountryRank>(db, countriesQuery(limit)),
    developers: (country, limit) => rows<DeveloperRank>(db, developersQuery(country, limit)),
  };
}
