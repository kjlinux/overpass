import { describe, expect, it } from "vitest";
import { detectLanguage, initialLanguage, toLanguage } from "../app/language";
import { indexLoaders, namespaceOf, namespaces } from "./locale-backend";

const files = import.meta.glob<Record<string, unknown>>("../**/locales/*.json", {
  eager: true,
  import: "default",
});

function keysOf(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null
      ? keysOf(child as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("web translations", () => {
  it("has the same keys in every language of each module", () => {
    for (const namespace of namespaces) {
      const languages = Object.entries(files).filter(([path]) => namespaceOf(path) === namespace);
      expect(languages.length, namespace).toBeGreaterThan(1);
      const [reference, ...others] = languages.map(([, json]) => keysOf(json));
      for (const keys of others) expect(keys, namespace).toEqual(reference);
    }
  });

  it("names a namespace after the folder that owns the locales directory", () => {
    expect(namespaceOf("/src/components/ui/locales/fr.json")).toBe("ui");
    const index = indexLoaders({
      "/src/app/locales/en.json": () => Promise.resolve({ default: {} }),
    });
    expect([...index.keys()]).toEqual(["app/en"]);
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
