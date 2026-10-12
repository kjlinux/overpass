import { describe, expect, it } from "vitest";
import { checkBudget, homeAssets } from "./bundle-budget.ts";

const manifest = {
  "index.html": { file: "assets/index.js", imports: ["_shared.js"], css: ["assets/index.css"] },
  "_shared.js": { file: "assets/shared.js" },
  "src/app/HomePage.tsx": { file: "assets/home.js", imports: ["_shared.js"] },
  "src/app/Other.tsx": { file: "assets/other.js" },
};

describe("homeAssets", () => {
  it("follows static imports from every root, once", () => {
    expect(homeAssets(manifest, ["index.html", "src/app/HomePage.tsx"])).toEqual([
      "assets/home.js",
      "assets/index.css",
      "assets/index.js",
      "assets/shared.js",
    ]);
  });

  it("fails loudly when a root disappears from the build", () => {
    expect(() => homeAssets(manifest, ["src/app/Missing.tsx"])).toThrow(/Missing/);
  });
});

describe("checkBudget", () => {
  const budget = { jsGzipBytes: 100, totalGzipBytes: 150 };

  it("accepts a page within budget", () => {
    expect(checkBudget({ "a.js": 60, "a.css": 50 }, budget)).toEqual([]);
  });

  it("reports JavaScript and total overruns separately", () => {
    expect(checkBudget({ "a.js": 120, "a.css": 40 }, budget)).toHaveLength(2);
  });
});
