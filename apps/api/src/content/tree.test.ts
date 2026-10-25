import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../db/client.js";
import { createTestDatabase } from "../db/testing.js";
import { ensureAdmin } from "../modules/accounts/index.js";
import { seedContent } from "../seed-content.js";
import { readContent } from "./read.js";

const tree = fileURLToPath(new URL("../../content/", import.meta.url));
const now = () => new Date("2026-10-23T10:00:00.000Z");

let db: Database;
let close: () => Promise<void>;
let handle: string;

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
  await ensureAdmin(db, {
    email: "team@example.com",
    password: "a long passphrase",
    country: "CI",
  });
  const result: unknown = await db.execute(sql`select handle from users`);
  handle = (result as { rows: { handle: string }[] }).rows[0]?.handle ?? "";
});
afterEach(() => close());

describe("the shipped content tree", () => {
  it("holds the ten planned itineraries, the team's threads and articles in both languages", () => {
    const content = readContent(tree);
    expect(content.routes).toHaveLength(10);
    const welcome = content.threads.filter((thread) => thread.author === undefined);
    expect(welcome.filter((thread) => thread.language === "fr")).toHaveLength(6);
    expect(welcome.filter((thread) => thread.language === "en")).toHaveLength(6);
    expect(new Set(welcome.map((thread) => thread.topic)).size).toBe(6);
    const news = content.posts.filter((post) => post.kind === "news");
    const groups = new Map<string, Set<string>>();
    for (const post of news) {
      groups.set(post.group, (groups.get(post.group) ?? new Set()).add(post.language));
    }
    expect(groups.size).toBe(5);
    expect([...groups.values()].every((languages) => languages.size === 2)).toBe(true);
    expect(news.every((post) => post.cover !== undefined)).toBe(true);
  });

  it("holds a community of eight members with their questions, answers and stories", () => {
    const content = readContent(tree);
    expect(content.members).toHaveLength(8);
    const questions = content.threads.filter((thread) => thread.author !== undefined);
    expect(questions).toHaveLength(8);
    expect(questions.every((thread) => thread.replies.length >= 2)).toBe(true);
    expect(content.posts.filter((post) => post.kind === "member")).toHaveLength(6);
  });

  it("never dates a contribution before its author joined or its thread opened", () => {
    const content = readContent(tree);
    const joined = new Map(content.members.map((member) => [member.handle, member.joinedAt]));
    const early = (handle: string, at: Date) => at < (joined.get(handle) ?? at);
    for (const thread of content.threads) {
      if (thread.author !== undefined && thread.at !== undefined) {
        expect(early(thread.author, thread.at), thread.title).toBe(false);
      }
      for (const reply of thread.replies) {
        expect(early(reply.author, reply.at), `${thread.title} ${reply.author}`).toBe(false);
        expect(reply.at >= (thread.at ?? reply.at), thread.title).toBe(true);
      }
    }
    for (const post of content.posts) {
      if (post.author !== undefined) expect(early(post.author, post.publishedAt)).toBe(false);
      for (const comment of post.comments) {
        expect(early(comment.author, comment.at), `${post.title} ${comment.author}`).toBe(false);
        expect(comment.at >= post.publishedAt, post.title).toBe(true);
      }
    }
  });

  it("seeds on a fresh database once, then creates nothing", async () => {
    expect(await seedContent(db, handle, tree, now)).toEqual({
      members: 8,
      routes: 10,
      threads: 20,
      posts: 16,
    });
    expect(await seedContent(db, handle, tree, now)).toEqual({
      members: 0,
      routes: 0,
      threads: 0,
      posts: 0,
    });
  });
});
