import { describe, expect, it } from "vitest";
import { apiMessages, envelopeSchema, ok, pickLanguage } from "./index.js";
import { z } from "zod";

function keysOf(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null
      ? keysOf(child as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("pickLanguage", () => {
  it("returns the first supported language", () => {
    expect(pickLanguage("de-DE, en-US;q=0.8, fr;q=0.5")).toBe("en");
  });

  it("falls back to French", () => {
    expect(pickLanguage(undefined)).toBe("fr");
    expect(pickLanguage("de")).toBe("fr");
  });
});

describe("envelope", () => {
  it("validates a successful envelope", () => {
    const schema = envelopeSchema(z.object({ status: z.string() }));
    expect(schema.parse(ok({ status: "ok" }))).toEqual({ data: { status: "ok" }, error: null });
  });
});

describe("api messages", () => {
  it("has the same keys in every language", () => {
    expect(keysOf(apiMessages.en)).toEqual(keysOf(apiMessages.fr));
  });
});
