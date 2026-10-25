import { postCategories, postFeeds } from "@overpass/shared";
import type { Language, PostCategory, PostFeed } from "@overpass/shared";

export type BlogQuery = { feed?: PostFeed; category?: PostCategory };

const isFeed = (value: string | null): value is PostFeed =>
  (postFeeds as readonly (string | null)[]).includes(value);

const isCategory = (value: string | null): value is PostCategory =>
  (postCategories as readonly (string | null)[]).includes(value);

/** Unknown values are dropped, so a shared link never sends an invalid filter. */
export function blogQueryFrom(search: string): BlogQuery {
  const params = new URLSearchParams(search);
  const feed = params.get("feed");
  const category = params.get("category");
  return {
    ...(isFeed(feed) ? { feed } : {}),
    ...(isCategory(category) ? { category } : {}),
  };
}

function feedParams(query: BlogQuery & { author?: string }, cursor?: string): URLSearchParams {
  const params = new URLSearchParams();
  if (query.author !== undefined) params.set("author", query.author);
  if (query.feed !== undefined) params.set("feed", query.feed);
  if (query.category !== undefined) params.set("category", query.category);
  if (cursor !== undefined) params.set("cursor", cursor);
  return params;
}

export function blogSearch(query: BlogQuery, cursor?: string): string {
  const search = feedParams(query, cursor).toString();
  return search === "" ? "" : `?${search}`;
}

/** The reader's language picks one version of each translated post, the others come as written. */
export function postsPath(
  query: BlogQuery & { author?: string },
  language: Language,
  cursor?: string,
): string {
  const params = feedParams(query, cursor);
  params.set("lang", language);
  return `/v1/posts?${params.toString()}`;
}
