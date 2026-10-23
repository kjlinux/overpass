import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";
import { readContent } from "./read.js";

let dir: string;

const route = [
  "---",
  'title: "Encaisser un paiement Wave Checkout depuis Laravel"',
  "service: wave",
  "country: CI",
  "stack: laravel",
  "language: fr",
  "---",
  "",
  "## Prérequis",
  "",
  "Un compte marchand.",
].join("\n");

const thread = [
  "---",
  'title: "Bienvenue sur Intégrations et API"',
  "topic: integrations",
  "language: fr",
  "---",
  "Corps.",
].join("\n");

const post = [
  "---",
  'title: "Overpass ouvre ses portes"',
  "kind: news",
  "category: tech-news",
  "language: fr",
  "group: launch",
  'summary: "Le résumé."',
  "publishedAt: 2026-10-23",
  "---",
  "Corps.",
].join("\n");

function write(path: string, text: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "overpass-content-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("parseFrontmatter", () => {
  it("splits quoted and bare fields from the Markdown body", () => {
    const parsed = parseFrontmatter(route);
    expect(parsed.fields).toEqual({
      title: "Encaisser un paiement Wave Checkout depuis Laravel",
      service: "wave",
      country: "CI",
      stack: "laravel",
      language: "fr",
    });
    expect(parsed.body).toBe("## Prérequis\n\nUn compte marchand.");
  });

  it("refuses a file without a frontmatter block", () => {
    expect(() => parseFrontmatter("# Just a title")).toThrow(/frontmatter/);
  });

  it("tolerates a byte order mark, Windows line endings and spaces around the fences", () => {
    const text = `${String.fromCharCode(0xfeff)}--- \r\ntitle: "Hello there"\r\n---  \r\nBody.\r\n`;
    expect(parseFrontmatter(text)).toEqual({ fields: { title: "Hello there" }, body: "Body." });
  });

  it("refuses a duplicate key instead of keeping the last one", () => {
    expect(() => parseFrontmatter("---\nstack: php\nstack: nodejs\n---\nBody.")).toThrow(/stack/);
  });
});

describe("readContent", () => {
  it("reads routes, threads and posts from their folders, sorted by name", () => {
    write("routes/02-wave-ci-laravel.md", route);
    write("routes/01-wave-ci-nodejs.md", route.replace("stack: laravel", "stack: nodejs"));
    write("threads/fr/01-integrations.md", thread);
    write("posts/fr/01-launch.md", post);
    const content = readContent(dir);
    expect(content.routes.map((entry) => entry.stack)).toEqual(["nodejs", "laravel"]);
    expect(content.threads).toEqual([
      expect.objectContaining({ topic: "integrations", language: "fr", content: "Corps." }),
    ]);
    expect(content.posts).toEqual([
      expect.objectContaining({
        kind: "news",
        group: "launch",
        publishedAt: new Date("2026-10-23T00:00:00.000Z"),
      }),
    ]);
  });

  it("names the file when a field is invalid", () => {
    write("routes/01-bad.md", route.replace("stack: laravel", "stack: cobol"));
    expect(() => readContent(dir)).toThrow(/01-bad\.md/);
  });

  it("tolerates a missing folder", () => {
    write("routes/01-wave.md", route);
    expect(readContent(dir).threads).toEqual([]);
  });
});
