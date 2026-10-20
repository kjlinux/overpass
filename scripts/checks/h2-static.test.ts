import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveFile } from "./h2-static.ts";

const root = mkdtempSync(join(tmpdir(), "overpass-site-"));
mkdirSync(join(root, "fr"));
mkdirSync(join(root, "assets"));
writeFileSync(join(root, "index.html"), "shell");
writeFileSync(join(root, "fr", "index.html"), "home");
writeFileSync(join(root, "assets", "app.js"), "js");

describe("static file lookup", () => {
  it("serves a file, then a folder index, then the application shell", () => {
    expect(resolveFile(root, "/assets/app.js?v=1")).toBe(join(root, "assets", "app.js"));
    expect(resolveFile(root, "/fr")).toBe(join(root, "fr", "index.html"));
    expect(resolveFile(root, "/fr/routes/42")).toBe(join(root, "index.html"));
  });

  it("never leaves the site folder", () => {
    expect(resolveFile(root, "/../../etc/passwd")).toBe(join(root, "index.html"));
    expect(resolveFile(root, "/%2e%2e/%2e%2e/secret")).toBe(join(root, "index.html"));
  });
});
