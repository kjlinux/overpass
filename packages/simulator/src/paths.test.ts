import { describe, expect, it } from "vitest";
import { matchPath } from "./paths.js";

describe("matchPath", () => {
  it("matches a static path", () => {
    expect(matchPath("/v1/checkout/sessions", "/v1/checkout/sessions")).toEqual({});
  });

  it("captures named parameters", () => {
    expect(matchPath("/sessions/:id/refund", "/sessions/cos_1/refund")).toEqual({ id: "cos_1" });
  });

  it("decodes encoded parameters", () => {
    expect(matchPath("/alias/:cle", "/alias/a%20b")).toEqual({ cle: "a b" });
  });

  it("ignores a trailing slash", () => {
    expect(matchPath("/sessions/:id", "/sessions/cos_1/")).toEqual({ id: "cos_1" });
  });

  it("rejects a different segment count", () => {
    expect(matchPath("/sessions/:id", "/sessions/cos_1/refund")).toBeUndefined();
  });

  it("rejects a different static segment", () => {
    expect(matchPath("/sessions/:id/refund", "/sessions/cos_1/expire")).toBeUndefined();
  });

  it("rejects an empty parameter", () => {
    expect(matchPath("/sessions/:id", "/sessions//")).toBeUndefined();
  });

  it("rejects a malformed escape instead of throwing", () => {
    expect(matchPath("/alias/:cle", "/alias/%E0%A4%A")).toBeUndefined();
  });
});
