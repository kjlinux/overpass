import { describe, expect, it } from "vitest";
import { findDeepImports } from "./deep-imports.ts";
import { findEmDashes } from "./em-dash.ts";
import { checkFileShape } from "./file-shape.ts";

describe("findEmDashes", () => {
  it("reports the line of each em dash", () => {
    expect(findEmDashes("a.md", "ok\nbad \u2014 here")).toEqual(["a.md:2 contains an em dash"]);
  });

  it("accepts hyphens and en dashes", () => {
    expect(findEmDashes("a.md", "a - b \u2013 c")).toEqual([]);
  });
});

describe("checkFileShape", () => {
  it("rejects files over 200 lines", () => {
    const content = Array.from({ length: 201 }, () => "x;").join("\n");
    expect(checkFileShape("a.ts", content)).toHaveLength(1);
  });

  it("rejects more than 20 percent comments, block comments included", () => {
    const content = ["/*", " * a", " */", "x;", "y;"].join("\n");
    expect(checkFileShape("a.ts", content)).toHaveLength(1);
  });

  it("accepts a single comment among enough code", () => {
    const content = ["// why", "a;", "b;", "c;", "d;"].join("\n");
    expect(checkFileShape("a.ts", content)).toEqual([]);
  });
});

describe("findDeepImports", () => {
  const file = "apps/api/src/modules/routes/service.ts";

  it("allows imports inside the same module", () => {
    expect(findDeepImports(file, 'import { x } from "./repository.js";')).toEqual([]);
  });

  it("allows another module through its index", () => {
    expect(findDeepImports(file, 'import { x } from "../accounts/index.js";')).toEqual([]);
  });

  it("rejects reaching into another module", () => {
    expect(findDeepImports(file, 'import { x } from "../accounts/service.js";')).toHaveLength(1);
  });

  it("rejects package internals", () => {
    expect(findDeepImports(file, 'import { x } from "@overpass/shared/src/a";')).toHaveLength(1);
  });
});
