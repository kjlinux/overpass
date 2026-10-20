import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  apiMessages,
  languageNames,
  readLocales,
  routeTemplate,
  supportedLanguages,
} from "../index.js";

const folders: string[] = [];

function localesFolder(codes: readonly string[]): URL {
  const folder = mkdtempSync(join(tmpdir(), "locales-"));
  folders.push(folder);
  for (const code of codes) writeFileSync(join(folder, `${code}.json`), JSON.stringify({ code }));
  return pathToFileURL(`${folder}/`);
}

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe("readLocales", () => {
  it("reads one catalogue per supported language", () => {
    const copy = readLocales<{ code: string }>(localesFolder(["fr", "en"]));
    expect(Object.keys(copy)).toEqual([...supportedLanguages]);
    expect(copy.en.code).toBe("en");
  });

  it("picks up a third language once the list names it, without code", () => {
    const copy = readLocales<{ code: string }, "fr" | "en" | "xx">(
      localesFolder(["fr", "en", "xx"]),
      [...supportedLanguages, "xx"],
    );
    expect(copy.xx.code).toBe("xx");
  });

  it("fails loudly when a listed language has no catalogue", () => {
    expect(() => readLocales(localesFolder(["fr"]))).toThrow(/en\.json/);
  });
});

describe("the shared language list", () => {
  it("derives the languages, their names and the shared copy from one record", () => {
    expect(supportedLanguages).toEqual(["fr", "en"]);
    expect(languageNames).toEqual({ fr: "Français", en: "English" });
    expect(Object.keys(apiMessages)).toEqual([...supportedLanguages]);
    expect(routeTemplate("en")).toContain("## Prerequisites");
  });
});
