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
  it("defaults to light for anything but dark", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme("auto")).toBe("light");
  });

  it("falls back to light when storage is blocked", () => {
    expect(readStoredTheme(throwing)).toBe("light");
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
    writeStoredTheme(storage, "dark");
    expect(readStoredTheme(storage)).toBe("dark");
  });
});
