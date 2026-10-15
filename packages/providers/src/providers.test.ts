import { createSimulator } from "@overpass/simulator";
import { describe, expect, it } from "vitest";
import { providers } from "./index.js";

describe("providers", () => {
  it("load together in the engine, each id once", () => {
    expect(() => createSimulator(providers)).not.toThrow();
    expect(providers.map((provider) => provider.identity.id)).toEqual(["wave", "pi-spi"]);
  });

  it.each(providers.map((provider) => [provider.identity.id, provider] as const))(
    "%s is marked unofficial, dated and described in French and English",
    (_id, provider) => {
      expect(provider.identity.unofficial).toBe(true);
      expect(provider.identity.docsUrl).toMatch(/^https:\/\//);
      expect(provider.identity.consultedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(provider.identity.copy.fr?.summary).toBeTruthy();
      expect(provider.identity.copy.en?.notes).toHaveLength(
        provider.identity.copy.fr?.notes.length ?? -1,
      );
    },
  );
});
