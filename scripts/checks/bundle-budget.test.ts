import { describe, expect, it } from "vitest";
import { checkBudget, chunkClosure, homeAssets, homeLoadAssets } from "./bundle-budget.ts";

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

describe("homeLoadAssets", () => {
  const lazy = {
    ...manifest,
    "src/app/HomePage.tsx": {
      file: "assets/home.js",
      imports: ["_shared.js"],
      dynamicImports: ["src/home/Demo.tsx", "src/home/scene/webhookScene.ts"],
    },
    "src/home/Demo.tsx": { file: "assets/demo.js", dynamicImports: ["src/home/Count.tsx"] },
    "src/home/Count.tsx": { file: "assets/count.js", imports: ["_motion.js"] },
    "_motion.js": { file: "assets/motion.js" },
    "src/home/scene/webhookScene.ts": { file: "assets/scene.js", imports: ["_three.js"] },
    "_three.js": { file: "assets/three.js" },
  };

  it("adds the lazy chunks the home page loads, without the scene", () => {
    const files = homeLoadAssets(
      lazy,
      ["src/app/HomePage.tsx"],
      ["src/home/scene/webhookScene.ts"],
    );
    expect(files).toEqual([
      "assets/count.js",
      "assets/demo.js",
      "assets/home.js",
      "assets/motion.js",
      "assets/shared.js",
    ]);
  });

  it("measures the scene chunk with what only it imports", () => {
    expect(chunkClosure(lazy, "src/home/scene/webhookScene.ts")).toEqual([
      "assets/scene.js",
      "assets/three.js",
    ]);
  });
});

describe("shared dynamic entries", () => {
  it("finds a page chunk that Vite keyed by its chunk name because lazy chunks import it", () => {
    const shared = {
      "index.html": { file: "assets/index.js" },
      "_HomePage-abc.js": {
        file: "assets/HomePage-abc.js",
        name: "HomePage",
        isDynamicEntry: true,
        dynamicImports: ["src/home/Demo.tsx"],
      },
      "src/home/Demo.tsx": { file: "assets/demo.js", imports: ["_HomePage-abc.js"] },
    };
    expect(homeLoadAssets(shared, ["src/app/HomePage.tsx"], [])).toEqual([
      "assets/HomePage-abc.js",
      "assets/demo.js",
    ]);
  });
});
