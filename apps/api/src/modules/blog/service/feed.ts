import type { Language, PostListQuery } from "@overpass/shared";
import { z } from "zod";
import { AppError } from "../../../http/app-error.js";
import { decodeDateCursor, encodeDateCursor } from "../../../http/date-cursor.js";
import type { FeedCursor, FeedFilters, FeedRow, PostRow } from "../model.js";
import { pageOf, toSummary } from "./context.js";
import type { BlogDeps, Reader } from "./context.js";
import { rssDocument } from "./rss.js";

const rssSize = 20;

const feedCursorSchema = z.object({
  t: z.union([z.literal(0), z.literal(1)]),
  s: z.number().int().min(0),
  at: z.iso.datetime(),
  id: z.uuid(),
});

function encodeFeedCursor(row: FeedRow): string {
  const cursor = {
    t: row.tier,
    s: row.tier === 0 ? 0 : row.starCount,
    at: row.publishedAt?.toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeFeedCursor(value: string): FeedCursor {
  try {
    const raw: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const parsed = feedCursorSchema.parse(raw);
    return { tier: parsed.t, stars: parsed.s, at: new Date(parsed.at), id: parsed.id };
  } catch {
    throw new AppError("validation_failed", 400, { cursor: "cursor_invalid" });
  }
}

const dateCursorOf = (row: PostRow) =>
  encodeDateCursor({ at: row.publishedAt ?? row.updatedAt, id: row.id });

/** Null when the author filter names nobody, so the page is simply empty. */
async function filtersOf(deps: BlogDeps, query: PostListQuery): Promise<FeedFilters | null> {
  const member =
    query.author === undefined ? undefined : await deps.repository.memberByHandle(query.author);
  if (member === null) return null;
  return {
    category: query.category,
    language: query.language,
    preferredLanguage: query.lang,
    authorId: member?.id,
    newsOnly: query.feed === "news",
    now: deps.now(),
    limit: query.limit,
  };
}

async function list(deps: BlogDeps, query: PostListQuery, reader: Reader) {
  const filters = await filtersOf(deps, query);
  if (filters === null) return { items: [], nextCursor: null };
  const cursor = query.cursor;
  if (query.feed === "forme") {
    const after = cursor === undefined ? undefined : decodeFeedCursor(cursor);
    const rows = await deps.repository.forMe(filters, reader?.id ?? null, after);
    return pageOf(rows, filters.limit, toSummary, encodeFeedCursor);
  }
  const after = cursor === undefined ? undefined : decodeDateCursor(cursor);
  const rows = await deps.repository.recent(filters, after);
  return pageOf(rows, filters.limit, toSummary, dateCursorOf);
}

async function blog(deps: BlogDeps, handle: string, reader: Reader) {
  const member = await deps.repository.memberByHandle(handle);
  if (member === null) throw new AppError("not_found", 404);
  const [suspended, followers, follows] = await Promise.all([
    deps.repository.isSuspended(member.id),
    deps.repository.followers(member.id),
    reader === null ? false : deps.repository.isFollowing(reader.id, member.id),
  ]);
  return {
    handle: member.handle,
    suspended,
    followers,
    viewer: { isOwner: reader?.id === member.id, follows },
  };
}

async function rss(deps: BlogDeps, language: Language): Promise<string> {
  const filters = { language, now: deps.now(), limit: rssSize };
  const rows = (await deps.repository.recent(filters)).slice(0, rssSize);
  return rssDocument({ language, webOrigin: deps.webOrigin, posts: rows, now: deps.now() });
}

export function feedService(deps: BlogDeps) {
  return {
    list: (query: PostListQuery, reader: Reader) => list(deps, query, reader),
    blog: (handle: string, reader: Reader) => blog(deps, handle, reader),
    rss: (language: Language) => rss(deps, language),
  };
}
