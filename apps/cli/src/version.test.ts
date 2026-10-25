import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readVersion } from "./version.js";

describe("readVersion", () => {
  it("returns the version of the package the command ships in", () => {
    const manifest = new URL("../package.json", import.meta.url);
    const { version } = JSON.parse(readFileSync(manifest, "utf8")) as { version: string };
    expect(readVersion(manifest)).toBe(version);
  });
});
