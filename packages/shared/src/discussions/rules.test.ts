import { describe, expect, it } from "vitest";
import {
  acceptEligibility,
  canRead,
  discussionRules,
  reportEligibility,
  statusAfterDecision,
  statusAfterReports,
  transformEligibility,
  voteEligibility,
} from "../index.js";

describe("statusAfterReports", () => {
  it("hides visible content from the second distinct report", () => {
    expect(discussionRules.hideAfterReports).toBe(2);
    expect(statusAfterReports("visible", 1)).toBe("visible");
    expect(statusAfterReports("visible", 2)).toBe("hidden");
    expect(statusAfterReports("visible", 5)).toBe("hidden");
  });

  it("never brings removed content back", () => {
    expect(statusAfterReports("removed", 3)).toBe("removed");
  });
});

describe("statusAfterDecision", () => {
  it("restores or removes, whatever the reports", () => {
    expect(statusAfterDecision("restore")).toBe("visible");
    expect(statusAfterDecision("remove")).toBe("removed");
  });
});

describe("reportEligibility", () => {
  const base = { isAuthor: false, alreadyReported: false, status: "visible" } as const;

  it("lets another member report once", () => {
    expect(reportEligibility(base)).toBe("allowed");
    expect(reportEligibility({ ...base, alreadyReported: true })).toBe("already_reported");
  });

  it("refuses a report on one's own content", () => {
    expect(reportEligibility({ ...base, isAuthor: true })).toBe("own_content");
  });

  it("accepts more reports on hidden content but not on removed content", () => {
    expect(reportEligibility({ ...base, status: "hidden" })).toBe("allowed");
    expect(reportEligibility({ ...base, status: "removed" })).toBe("unavailable");
  });
});

describe("voteEligibility", () => {
  const base = { isAuthor: false, alreadyVoted: false, status: "visible" } as const;

  it("allows one useful vote per account", () => {
    expect(voteEligibility(base)).toBe("allowed");
    expect(voteEligibility({ ...base, alreadyVoted: true })).toBe("already_voted");
  });

  it("refuses a vote on one's own reply or on hidden content", () => {
    expect(voteEligibility({ ...base, isAuthor: true })).toBe("own_reply");
    expect(voteEligibility({ ...base, status: "hidden" })).toBe("unavailable");
  });
});

describe("acceptEligibility", () => {
  const base = { isThreadAuthor: true, replyInThread: true, replyStatus: "visible" } as const;

  it("is reserved to the author of the thread", () => {
    expect(acceptEligibility(base)).toBe("allowed");
    expect(acceptEligibility({ ...base, isThreadAuthor: false })).toBe("not_author");
  });

  it("only accepts a visible reply of the same thread", () => {
    expect(acceptEligibility({ ...base, replyInThread: false })).toBe("not_found");
    expect(acceptEligibility({ ...base, replyStatus: "hidden" })).toBe("unavailable");
  });
});

describe("transformEligibility", () => {
  const base = { isThreadAuthor: true, resolved: true, alreadyTransformed: false };

  it("lets the author turn a resolved thread into a route, once", () => {
    expect(transformEligibility(base)).toBe("allowed");
    expect(transformEligibility({ ...base, alreadyTransformed: true })).toBe("already_transformed");
  });

  it("refuses another member or an unresolved thread", () => {
    expect(transformEligibility({ ...base, isThreadAuthor: false })).toBe("not_author");
    expect(transformEligibility({ ...base, resolved: false })).toBe("not_resolved");
  });
});

describe("canRead", () => {
  const reader = { isAuthor: false, isAdmin: false };

  it("shows visible content to everyone", () => {
    expect(canRead("visible", reader)).toBe(true);
  });

  it("keeps hidden content for its author and the moderators", () => {
    expect(canRead("hidden", reader)).toBe(false);
    expect(canRead("hidden", { ...reader, isAuthor: true })).toBe(true);
    expect(canRead("hidden", { ...reader, isAdmin: true })).toBe(true);
  });

  it("keeps removed content for the moderators only", () => {
    expect(canRead("removed", { ...reader, isAuthor: true })).toBe(false);
    expect(canRead("removed", { ...reader, isAdmin: true })).toBe(true);
  });
});
