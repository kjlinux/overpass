import { describe, expect, it } from "vitest";
import { detectLanguage, initialLanguage, toLanguage } from "../app/language";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

function keysOf(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null
      ? keysOf(child as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("web translations", () => {
  it("has the same keys in French and English", () => {
    expect(keysOf(en)).toEqual(keysOf(fr));
  });
});

describe("language helpers", () => {
  it("accepts only supported URL prefixes", () => {
    expect(toLanguage("en")).toBe("en");
    expect(toLanguage("de")).toBeUndefined();
  });

  it("derives the first language from the browser", () => {
    expect(initialLanguage("en-US")).toBe("en");
    expect(initialLanguage("de-DE")).toBe("fr");
    expect(initialLanguage(undefined)).toBe("fr");
  });

  it("prefers the URL, then the stored choice, then the browser", () => {
    expect(detectLanguage("/en/routes", "fr", "fr-FR")).toBe("en");
    expect(detectLanguage("/", "en", "fr-FR")).toBe("en");
    expect(detectLanguage("/", null, "en-GB")).toBe("en");
    expect(detectLanguage("/", "xx", "de")).toBe("fr");
  });
});
