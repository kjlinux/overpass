import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { supportedLanguages } from "../../packages/shared/src/i18n/languages.ts";
import { checkLocaleFolders, findLocaleImports, languageListFile } from "./locales.ts";
import { listRepoFiles } from "./repo-files.ts";

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

describe("findLocaleImports", () => {
  const file = "apps/api/src/modules/accounts/mail.ts";

  it("rejects a catalogue imported by its language", () => {
    const content = 'import fr from "./locales/fr.json" with { type: "json" };';
    expect(findLocaleImports(file, content)).toHaveLength(1);
  });

  it("accepts a type-only reference and the language list itself", () => {
    const typeOnly = 'import type catalogue from "./locales/fr.json";';
    expect(findLocaleImports(file, typeOnly)).toEqual([]);
    const list = 'import fr from "./locales/fr.json" with { type: "json" };';
    expect(findLocaleImports(languageListFile, list)).toEqual([]);
  });

  it("ignores tests and files outside apps and packages", () => {
    const content = 'import fr from "./locales/fr.json";';
    expect(findLocaleImports("apps/web/src/a.test.tsx", content)).toEqual([]);
    expect(findLocaleImports("e2e/home.spec.ts", content)).toEqual([]);
  });
});

describe("checkLocaleFolders", () => {
  const files = ["apps/x/src/locales/fr.json", "apps/x/src/locales/en.json"];

  it("accepts one file per language with the same keys", () => {
    const read = () => ({ a: { b: "1" }, list: ["x"] });
    expect(checkLocaleFolders(files, read, ["fr", "en"])).toEqual([]);
  });

  it("reports a missing language and a missing key", () => {
    const read = (file: string) => (file.endsWith("fr.json") ? { a: "1", b: "2" } : { a: "1" });
    expect(checkLocaleFolders(files, read, ["fr", "en", "xx"])).toEqual([
      "apps/x/src/locales has no xx.json",
      "apps/x/src/locales/en.json lacks b",
    ]);
  });

  it("reports a file for a language the list does not name", () => {
    const read = () => ({});
    expect(checkLocaleFolders(files, read, ["fr"])).toEqual([
      "apps/x/src/locales/en.json is not a supported language",
    ]);
  });
});

describe("the repository", () => {
  const files = listRepoFiles();

  it("has one catalogue per supported language in every locales folder, same keys", () => {
    expect(checkLocaleFolders(files, readJson, supportedLanguages)).toEqual([]);
  });

  it("never imports a catalogue by its language outside the language list", () => {
    const sources = files.filter((file) => /\.(ts|tsx)$/.test(file));
    const errors = sources.flatMap((file) => findLocaleImports(file, readFileSync(file, "utf8")));
    expect(errors).toEqual([]);
  });
});
