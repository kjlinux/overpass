import { describe, expect, it } from "vitest";
import { isAllowed } from "./license-policy.ts";

describe("isAllowed", () => {
  it("accepts a single permissive licence", () => {
    expect(isAllowed("MIT")).toBe(true);
    expect(isAllowed("PostgreSQL")).toBe(true);
  });

  it("rejects copyleft and unknown licences", () => {
    expect(isAllowed("GPL-3.0-only")).toBe(false);
    expect(isAllowed("LGPL-3.0-or-later")).toBe(false);
    expect(isAllowed("MPL-2.0")).toBe(false);
    expect(isAllowed("UNLICENSED")).toBe(false);
    expect(isAllowed("SEE LICENSE IN LICENSE.md")).toBe(false);
  });

  it("accepts a choice when one branch is permissive", () => {
    expect(isAllowed("(MIT OR GPL-3.0-or-later)")).toBe(true);
  });

  it("requires every part of a conjunction", () => {
    expect(isAllowed("Apache-2.0 AND LGPL-3.0-or-later")).toBe(false);
    expect(isAllowed("(MIT OR Apache-2.0) AND GPL-2.0-only")).toBe(false);
    expect(isAllowed("(MIT AND Zlib)")).toBe(true);
  });

  it("rejects licence exceptions until reviewed", () => {
    expect(isAllowed("Apache-2.0 WITH LLVM-exception")).toBe(false);
  });
});
