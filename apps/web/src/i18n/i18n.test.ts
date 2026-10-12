import { describe, expect, it } from "vitest";
import { initialLanguage, toLanguage } from "../app/language";
import { webResources } from "./i18n";

function keysOf(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null
      ? keysOf(child as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("web translations", () => {
  it("has the same keys in French and English", () => {
    expect(keysOf(webResources.en)).toEqual(keysOf(webResources.fr));
  });
});

describe("language helpers", () => {
  it("accepts only supported URL prefixes", () => {
    expect(toLanguage("en")).toBe("en");
    expect(toLanguage("de")).toBeUndefined();
  });

  it("derives the first language from the detector", () => {
    expect(initialLanguage("en-US")).toBe("en");
    expect(initialLanguage("de-DE")).toBe("fr");
    expect(initialLanguage(undefined)).toBe("fr");
  });
});
