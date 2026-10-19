import { describe, expect, it } from "vitest";
import { describeEvent, detectLanguage, messages } from "./messages.js";

describe("detectLanguage", () => {
  it.each([
    [{ LANG: "fr_FR.UTF-8" }, "fr"],
    [{ LC_ALL: "fr_SN" }, "fr"],
    [{ LANG: "en_US.UTF-8" }, "en"],
    [{ OVERPASS_LANG: "fr", LANG: "en_US" }, "fr"],
  ])("reads %j as %s", (env, language) => {
    expect(detectLanguage(env, "en-US")).toBe(language);
  });

  it("falls back to the system locale, then to English", () => {
    expect(detectLanguage({}, "fr-CI")).toBe("fr");
    expect(detectLanguage({}, "ja-JP")).toBe("en");
  });
});

describe("describeEvent", () => {
  const time = "10:00:00";

  it("prints a forwarded webhook with its local status and duration", () => {
    const event = {
      type: "forwarded",
      eventType: "checkout.session.completed",
      result: { status: 200, durationMs: 12 },
    } as const;
    expect(describeEvent(messages.fr, event, { forwardTo: "http://localhost:3000", time })).toBe(
      "10:00:00  checkout.session.completed  200 en 12 ms",
    );
  });

  it("explains a failed forward in words", () => {
    const event = {
      type: "forwarded",
      eventType: "e",
      result: { status: null, durationMs: 3, error: "connection_failed" },
    } as const;
    expect(describeEvent(messages.en, event, { forwardTo: "x", time })).toBe(
      "10:00:00  e  failed: local server unreachable",
    );
  });

  it("announces the relay and the reconnections", () => {
    const ready = { type: "ready", provider: "wave", keyPrefix: "ovp_test_ab12" } as const;
    expect(
      describeEvent(messages.en, ready, { forwardTo: "http://localhost:3000/webhook", time }),
    ).toContain("http://localhost:3000/webhook");
    expect(
      describeEvent(messages.fr, { type: "reconnecting", inMs: 4000 }, { forwardTo: "x", time }),
    ).toBe("Connexion perdue. Nouvel essai dans 4 s.");
  });

  it("has the same keys in both languages", () => {
    const keys = (value: object): string[] =>
      Object.entries(value).flatMap(([key, item]) =>
        typeof item === "object" ? keys(item as object).map((sub) => `${key}.${sub}`) : [key],
      );
    expect(keys(messages.fr).sort()).toEqual(keys(messages.en).sort());
  });
});
