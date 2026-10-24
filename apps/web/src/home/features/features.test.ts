import { describe, expect, it } from "vitest";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { features } from "./features";

describe("features", () => {
  it("names every module of the product, each with its own page", () => {
    expect(features.map((feature) => feature.path)).toEqual([
      "/routes",
      "/routes/new",
      "/sandbox",
      "/sandbox",
      "/docs",
      "/discussions",
      "/blog",
      "/newsletter",
      "/ranking",
      "/services/propose",
      "/simulator-requests",
    ]);
  });

  it("has a title and a sentence in both languages for every cell", () => {
    for (const locale of [fr, en]) {
      for (const { key } of features) {
        const entry = (locale.features.items as Record<string, { title: string; body: string }>)[
          key
        ];
        expect(entry?.title, key).toBeTruthy();
        expect(entry?.body, key).toBeTruthy();
      }
    }
  });
});
