import { describe, expect, it } from "vitest";
import { loggedUrl, redactedHeaders } from "./log-request.js";

describe("loggedUrl", () => {
  it("drops the query of newsletter links, which carries a permanent token", () => {
    expect(loggedUrl("/v1/newsletter/unsubscribe?token=abc.def")).toBe(
      "/v1/newsletter/unsubscribe",
    );
  });

  it("keeps other queries, useful to read the logs", () => {
    expect(loggedUrl("/v1/posts?feed=forme&limit=20")).toBe("/v1/posts?feed=forme&limit=20");
  });
});

describe("redactedHeaders", () => {
  it("hides the session, the API key and every header an operator declares secret", () => {
    const operators = [{ secretHeaders: ["acme-token"] }, {}, { secretHeaders: ["zeta-key"] }];
    expect(redactedHeaders(operators)).toEqual([
      "req.headers.cookie",
      "req.headers.authorization",
      'req.headers["x-api-key"]',
      'req.headers["acme-token"]',
      'req.headers["zeta-key"]',
    ]);
  });
});
