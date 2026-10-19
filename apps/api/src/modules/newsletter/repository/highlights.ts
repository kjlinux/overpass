import type { IssueItem, IssueItemRef, Language } from "@overpass/shared";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { listedPostCondition } from "../../blog/index.js";
import { listedRouteCondition } from "../../routes/index.js";
import type { HighlightsPart } from "../model.js";
import { at, rows } from "./sql.js";

const excerptLength = 200;

const routeColumns = sql`'route' as kind, r.id, r.title,
  concat(s.name, ', ', trim(r.country)) as summary, '/routes/' || r.id as path`;
const threadColumns = sql`'thread' as kind, t.id, t.title,
  left(t.content, ${excerptLength}) as summary, '/discussions/' || t.id as path`;
const postColumns = sql`'post' as kind, p.id, p.title, p.summary, '/blog/' || p.slug as path`;

const liveRoute = listedRouteCondition("r");
const liveThread = sql`t.status = 'visible'`;
const livePost = (now: Date) => listedPostCondition("p", at(now));

/** Checks of the week first, then the newest itineraries of the week. */
function bestRoutes(language: Language, since: Date, limit: number): SQL {
  const checks = sql`(select count(*) from checks c
    where c.route_id = r.id and c.checked_at >= ${at(since)})`;
  return sql`select ${routeColumns} from routes r join services s on s.id = r.service_id
    where ${liveRoute} and r.language = ${language}
      and (${checks} > 0 or r.created_at >= ${at(since)})
    order by ${checks} desc, r.created_at desc limit ${limit}`;
}

/** Replies and useful votes of the week measure how much a discussion helped. */
function bestThreads(language: Language, since: Date, limit: number): SQL {
  const activity = sql`(select count(*) from replies x
      where x.thread_id = t.id and x.status = 'visible' and x.created_at >= ${at(since)})
    + (select count(*) from reply_votes v join replies x on x.id = v.reply_id
      where x.thread_id = t.id and v.created_at >= ${at(since)})`;
  return sql`select ${threadColumns} from threads t
    where ${liveThread} and t.language = ${language} and t.last_activity_at >= ${at(since)}
    order by ${activity} desc, t.last_activity_at desc limit ${limit}`;
}

function bestPosts(language: Language, since: Date, now: Date, limit: number): SQL {
  return sql`select ${postColumns} from posts p
    where ${livePost(now)} and p.language = ${language} and p.published_at >= ${at(since)}
    order by p.star_count desc, p.published_at desc limit ${limit}`;
}

const idList = (ids: string[]) =>
  sql.join(ids.length === 0 ? [sql`null`] : ids.map((id) => sql`${id}::uuid`), sql`, `);

async function resolveItems(db: Database, refs: IssueItemRef[], now: Date): Promise<IssueItem[]> {
  const of = (kind: IssueItemRef["kind"]) =>
    idList(refs.filter((r) => r.kind === kind).map((r) => r.id));
  const found = await rows<IssueItem>(
    db,
    sql`(select ${routeColumns} from routes r join services s on s.id = r.service_id
        where ${liveRoute} and r.id in (${of("route")}))
      union all (select ${threadColumns} from threads t where ${liveThread} and t.id in (${of("thread")}))
      union all (select ${postColumns} from posts p where ${livePost(now)} and p.id in (${of("post")}))`,
  );
  const byKey = new Map(found.map((item) => [`${item.kind}:${item.id}`, item]));
  return refs.flatMap((ref) => byKey.get(`${ref.kind}:${ref.id}`) ?? []);
}

export function highlightQueries(db: Database): HighlightsPart {
  return {
    highlights: async (language, since, now, perKind) => {
      const parts = await Promise.all([
        rows<IssueItem>(db, bestRoutes(language, since, perKind)),
        rows<IssueItem>(db, bestThreads(language, since, perKind)),
        rows<IssueItem>(db, bestPosts(language, since, now, perKind)),
      ]);
      return parts.flat();
    },
    resolveItems: (refs, now) => resolveItems(db, refs, now),
  };
}
