import { describe, expect, it } from "vitest";
import { parseTheme, readStoredTheme, writeStoredTheme } from "./theme";

const throwing = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("theme storage", () => {
  it("defaults to dark for anything but light", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme(null)).toBe("dark");
    expect(parseTheme("auto")).toBe("dark");
  });

  it("falls back to dark when storage is blocked", () => {
    expect(readStoredTheme(throwing)).toBe("dark");
    expect(() => {
      writeStoredTheme(throwing, "dark");
    }).not.toThrow();
  });

  it("reads back what it wrote", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    writeStoredTheme(storage, "light");
    expect(readStoredTheme(storage)).toBe("light");
  });
});
