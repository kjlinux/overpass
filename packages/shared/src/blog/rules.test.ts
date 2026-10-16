import { describe, expect, it } from "vitest";
import {
  blogReportEligibility,
  blogRules,
  canReadPost,
  followEligibility,
  isListed,
  slugFor,
  starEligibility,
  statusAfterAction,
  statusAfterPostReports,
  writeEligibility,
} from "../index.js";

const now = new Date("2026-10-16T10:00:00Z");
const listed = {
  status: "published",
  moderation: "visible",
  publishedAt: new Date("2026-10-15T10:00:00Z"),
  suspended: false,
} as const;

describe("isListed", () => {
  it("lists a visible post published in the past on an active blog", () => {
    expect(isListed(listed, now)).toBe(true);
  });

  it("keeps drafts, scheduled posts, hidden content and suspended blogs out", () => {
    expect(isListed({ ...listed, status: "draft" }, now)).toBe(false);
    expect(isListed({ ...listed, publishedAt: new Date("2026-10-17T00:00:00Z") }, now)).toBe(false);
    expect(isListed({ ...listed, publishedAt: null }, now)).toBe(false);
    expect(isListed({ ...listed, moderation: "hidden" }, now)).toBe(false);
    expect(isListed({ ...listed, moderation: "blocked" }, now)).toBe(false);
    expect(isListed({ ...listed, suspended: true }, now)).toBe(false);
  });
});

describe("statusAfterPostReports", () => {
  it("hides visible content from the second distinct report", () => {
    expect(blogRules.hideAfterReports).toBe(2);
    expect(statusAfterPostReports("visible", 1)).toBe("visible");
    expect(statusAfterPostReports("visible", 2)).toBe("hidden");
  });

  it("never changes a decision already taken", () => {
    expect(statusAfterPostReports("blocked", 4)).toBe("blocked");
    expect(statusAfterPostReports("hidden", 4)).toBe("hidden");
  });
});

describe("statusAfterAction", () => {
  it("maps each admin action to a status", () => {
    expect(statusAfterAction("hide")).toBe("hidden");
    expect(statusAfterAction("block")).toBe("blocked");
    expect(statusAfterAction("restore")).toBe("visible");
  });
});

describe("writeEligibility", () => {
  it("reserves news to admins", () => {
    expect(writeEligibility({ kind: "news", role: "member", suspended: false })).toBe("admin_only");
    expect(writeEligibility({ kind: "news", role: "admin", suspended: false })).toBe("allowed");
  });

  it("lets any member write on an active blog", () => {
    expect(writeEligibility({ kind: "member", role: "member", suspended: false })).toBe("allowed");
    expect(writeEligibility({ kind: "member", role: "member", suspended: true })).toBe(
      "blog_suspended",
    );
  });
});

describe("starEligibility", () => {
  const base = { isAuthor: false, alreadyStarred: false, listed: true };

  it("allows one star per account on a listed post", () => {
    expect(starEligibility(base)).toBe("allowed");
    expect(starEligibility({ ...base, alreadyStarred: true })).toBe("already_starred");
  });

  it("refuses a star on one's own post or on an unlisted one", () => {
    expect(starEligibility({ ...base, isAuthor: true })).toBe("own_post");
    expect(starEligibility({ ...base, listed: false })).toBe("unavailable");
  });
});

describe("followEligibility", () => {
  it("refuses to follow oneself", () => {
    expect(followEligibility({ self: true })).toBe("own_blog");
    expect(followEligibility({ self: false })).toBe("allowed");
  });
});

describe("blogReportEligibility", () => {
  const base = { isAuthor: false, alreadyReported: false, status: "visible" } as const;

  it("lets another member report once, hidden content included", () => {
    expect(blogReportEligibility(base)).toBe("allowed");
    expect(blogReportEligibility({ ...base, status: "hidden" })).toBe("allowed");
    expect(blogReportEligibility({ ...base, alreadyReported: true })).toBe("already_reported");
  });

  it("refuses one's own content and blocked content", () => {
    expect(blogReportEligibility({ ...base, isAuthor: true })).toBe("own_content");
    expect(blogReportEligibility({ ...base, status: "blocked" })).toBe("unavailable");
  });
});

describe("canReadPost", () => {
  const reader = { isAuthor: false, isAdmin: false };

  it("shows listed posts to everyone and the rest to admins", () => {
    expect(canReadPost({ listed: true, moderation: "visible" }, reader)).toBe(true);
    expect(
      canReadPost({ listed: false, moderation: "blocked" }, { ...reader, isAdmin: true }),
    ).toBe(true);
    expect(canReadPost({ listed: false, moderation: "visible" }, reader)).toBe(false);
  });

  it("lets the author read drafts and hidden posts, not blocked ones", () => {
    const author = { ...reader, isAuthor: true };
    expect(canReadPost({ listed: false, moderation: "hidden" }, author)).toBe(true);
    expect(canReadPost({ listed: false, moderation: "blocked" }, author)).toBe(false);
  });
});

describe("slugFor", () => {
  it("builds a readable ascii slug from a French title", () => {
    expect(slugFor("Écrire une API à Abidjan : le guide")).toBe(
      "ecrire-une-api-a-abidjan-le-guide",
    );
  });

  it("bounds the length and never returns an empty slug", () => {
    expect(slugFor("a".repeat(200)).length).toBeLessThanOrEqual(blogRules.slugMaxLength);
    expect(slugFor("!!!")).toBe("post");
  });
});
