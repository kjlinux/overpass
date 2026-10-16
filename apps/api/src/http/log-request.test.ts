import { describe, expect, it } from "vitest";
import { loggedUrl } from "./log-request.js";

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
