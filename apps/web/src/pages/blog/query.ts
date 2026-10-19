import { postCategories, postFeeds } from "@overpass/shared";
import type { PostCategory, PostFeed } from "@overpass/shared";

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

export function blogSearch(query: BlogQuery, cursor?: string): string {
  const params = new URLSearchParams();
  if (query.feed !== undefined) params.set("feed", query.feed);
  if (query.category !== undefined) params.set("category", query.category);
  if (cursor !== undefined) params.set("cursor", cursor);
  const search = params.toString();
  return search === "" ? "" : `?${search}`;
}
