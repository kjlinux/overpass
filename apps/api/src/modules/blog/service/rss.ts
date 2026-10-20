import { readLocales } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import type { PostRow } from "../model.js";
import type catalogue from "../locales/fr.json";

type Copy = typeof catalogue;

const texts = readLocales<Copy>(new URL("../locales/", import.meta.url));

const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Tab, line feed and carriage return are the only control characters XML 1.0 allows. */
const allowedControls = new Set([0x09, 0x0a, 0x0d]);

const forbidden = (code: number): boolean =>
  (code < 0x20 && !allowedControls.has(code)) || code === 0xfffe || code === 0xffff;

/** Escapes XML and drops the characters XML 1.0 forbids. */
export function xml(text: string): string {
  const kept = Array.from(text, (char) => (forbidden(char.codePointAt(0) ?? 0) ? "" : char));
  return kept.join("").replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

const tag = (name: string, value: string) => `<${name}>${xml(value)}</${name}>`;

function item(post: PostRow, link: string, team: string): string {
  return [
    "<item>",
    tag("title", post.title),
    tag("link", link),
    `<guid isPermaLink="true">${xml(link)}</guid>`,
    tag("pubDate", (post.publishedAt ?? post.updatedAt).toUTCString()),
    tag("dc:creator", post.authorHandle ?? team),
    tag("category", post.category),
    tag("description", post.summary),
    "</item>",
  ].join("");
}

/** RSS 2.0 with plain-text summaries only: no member HTML ever reaches a feed reader. */
export function rssDocument(feed: {
  language: Language;
  webOrigin: string;
  posts: PostRow[];
  now: Date;
}): string {
  const copy = texts[feed.language].rss;
  const home = `${feed.webOrigin}/${feed.language}/blog`;
  const items = feed.posts.map((post) => item(post, `${home}/${post.slug}`, copy.team));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>',
    tag("title", copy.title),
    tag("link", home),
    tag("description", copy.description),
    tag("language", feed.language),
    tag("lastBuildDate", feed.now.toUTCString()),
    ...items,
    "</channel></rss>",
  ].join("\n");
}
