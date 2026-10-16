import { describe, expect, it } from "vitest";
import { referenceOf } from "./openapi";

const document = {
  info: {
    title: "Overpass sandbox",
    "x-providers": [{ id: "wave", name: "Wave", unofficial: true, docsVersion: "v1" }],
  },
  paths: {
    "/v1/sandbox/wave/v1/checkout/sessions": {
      post: {
        summary: "Create a checkout session",
        tags: ["Wave"],
        parameters: [{ name: "Idempotency-Key", in: "header", required: false }],
        responses: { "200": {}, "400": {} },
      },
      get: { summary: "List sessions", tags: ["Wave"], responses: { "200": {} } },
    },
    "/v1/sandbox/listen": { get: { summary: "Listen", tags: ["Overpass"], responses: {} } },
  },
};

describe("referenceOf", () => {
  it("groups operations by tag in document order, with method, path and summary", () => {
    const groups = referenceOf(document).groups;
    expect(groups.map((group) => group.tag)).toEqual(["Wave", "Overpass"]);
    expect(groups[0]?.operations.map((op) => `${op.method} ${op.summary}`)).toEqual([
      "POST Create a checkout session",
      "GET List sessions",
    ]);
  });

  it("keeps parameters and response codes", () => {
    const [operation] = referenceOf(document).groups[0]?.operations ?? [];
    expect(operation?.parameters).toEqual([
      { name: "Idempotency-Key", in: "header", required: false },
    ]);
    expect(operation?.responses).toEqual(["200", "400"]);
  });

  it("lists the simulated providers with their unofficial mark", () => {
    expect(referenceOf(document).providers).toEqual([
      { id: "wave", name: "Wave", unofficial: true, docsVersion: "v1" },
    ]);
  });

  it("returns an empty reference for a document it cannot read", () => {
    expect(referenceOf({ nope: true })).toEqual({ groups: [], providers: [] });
  });
});
