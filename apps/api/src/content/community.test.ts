import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readContent } from "./read.js";

let dir: string;

const member = [
  "---",
  "handle: yao-dev",
  "country: CI",
  "language: fr",
  "stacks: laravel, vue",
  "joinedAt: 2026-10-23T08:30",
  "---",
].join("\n");

const memberThread = [
  "---",
  'title: "Wave CI : le webhook ne revient jamais en local"',
  "topic: integrations",
  "language: fr",
  "author: yao-dev",
  "at: 2026-10-24T08:00",
  "country: CI",
  "stack: laravel",
  "---",
  "Le webhook n'arrive jamais.",
  "",
  "@@ author=serge-tech at=2026-10-24T09:12 useful=yao-dev,awa-kone accepted @@",
  "Vérifiez l'URL publique.",
  "",
  "@@ author=yao-dev at=2026-10-24T10:00 @@",
  "Merci !",
].join("\n");

const memberPost = [
  "---",
  'title: "Je vous présente mon SaaS pour les salons"',
  "kind: member",
  "author: aminata-codes",
  "category: portraits",
  "language: fr",
  "group: salons",
  'summary: "Mon projet, point par point."',
  "publishedAt: 2026-10-24T08:00",
  "stars: yao-dev, kofi-builds",
  "---",
  "Bonjour à tous.",
  "",
  "@@ author=yao-dev at=2026-10-24T12:00 @@",
  "Bravo !",
].join("\n");

function write(path: string, text: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "overpass-community-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("readContent on community content", () => {
  it("reads fictional members, and a member thread with its replies and votes", () => {
    write("members/yao-dev.md", member);
    write("threads/fr/10-webhook.md", memberThread);
    const content = readContent(dir);
    expect(content.members).toEqual([
      {
        handle: "yao-dev",
        country: "CI",
        language: "fr",
        stacks: ["laravel", "vue"],
        joinedAt: new Date("2026-10-23T08:30:00.000Z"),
      },
    ]);
    const [question] = content.threads;
    expect(question).toMatchObject({ author: "yao-dev", country: "CI", stack: "laravel" });
    expect(question?.content).toBe("Le webhook n'arrive jamais.");
    expect(question?.replies).toEqual([
      {
        author: "serge-tech",
        at: new Date("2026-10-24T09:12:00.000Z"),
        useful: ["yao-dev", "awa-kone"],
        accepted: true,
        content: "Vérifiez l'URL publique.",
      },
      {
        author: "yao-dev",
        at: new Date("2026-10-24T10:00:00.000Z"),
        useful: [],
        accepted: false,
        content: "Merci !",
      },
    ]);
  });

  it("reads a member post with its stars and comments", () => {
    write("posts/fr/10-salons.md", memberPost);
    const [entry] = readContent(dir).posts;
    expect(entry).toMatchObject({ kind: "member", author: "aminata-codes" });
    expect(entry?.stars).toEqual(["yao-dev", "kofi-builds"]);
    expect(entry?.comments).toEqual([
      { author: "yao-dev", at: new Date("2026-10-24T12:00:00.000Z"), content: "Bravo !" },
    ]);
    expect(entry?.publishedAt).toEqual(new Date("2026-10-24T08:00:00.000Z"));
  });

  it("refuses two accepted replies, and a member post without its author", () => {
    write("threads/fr/10-webhook.md", memberThread.replace("10:00 @@", "10:00 accepted @@"));
    expect(() => readContent(dir)).toThrow(/10-webhook\.md/);
    rmSync(join(dir, "threads"), { recursive: true });
    write("posts/fr/10-salons.md", memberPost.replace("author: aminata-codes\n", ""));
    expect(() => readContent(dir)).toThrow(/10-salons\.md/);
  });
});
