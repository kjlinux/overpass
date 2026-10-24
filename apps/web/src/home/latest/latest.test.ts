import { describe, expect, it } from "vitest";
import { latestPaths, latestView, parseLatest } from "./latest";

const thread = {
  id: "7c7c5d0e-4a8f-4d6a-9b0e-2f1c9d3a1b11",
  topic: "career",
  title: "Premier emploi à Dakar",
  author: "awa",
  language: "fr",
  country: "SN",
  stack: null,
  route: null,
  service: null,
  state: "open",
  status: "visible",
  replies: 2,
  createdAt: "2026-10-20T10:00:00.000Z",
  lastActivityAt: "2026-10-21T10:00:00.000Z",
};

describe("parseLatest", () => {
  it("reads a page of threads against the shared contract", () => {
    const items = parseLatest("threads", { items: [thread], nextCursor: null });
    expect(items?.map((item) => item.title)).toEqual(["Premier emploi à Dakar"]);
  });

  it("rejects an off-contract body", () => {
    expect(parseLatest("threads", { items: [{ id: "x" }], nextCursor: null })).toBeNull();
    expect(parseLatest("posts", [])).toBeNull();
    expect(parseLatest("routes", null)).toBeNull();
  });
});

describe("latestPaths", () => {
  it("asks each list for its three newest items only", () => {
    expect(latestPaths.routes).toBe("/v1/routes?limit=3");
    expect(latestPaths.threads).toBe("/v1/threads?limit=3");
    expect(latestPaths.posts).toBe("/v1/posts?limit=3");
  });
});

describe("latestView", () => {
  it("keeps a skeleton while loading, hides on failure or when empty", () => {
    expect(latestView({ status: "loading" })).toEqual({ kind: "loading" });
    expect(latestView({ status: "error" })).toEqual({ kind: "hidden" });
    expect(latestView({ status: "ready", items: [] })).toEqual({ kind: "hidden" });
  });

  it("shows at most three items", () => {
    const items = [1, 2, 3, 4];
    expect(latestView({ status: "ready", items })).toEqual({ kind: "shown", items: [1, 2, 3] });
  });
});
