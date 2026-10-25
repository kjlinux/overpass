import { blogRules } from "./fields.js";
import type { ModerationAction, ModerationStatus, PostKind, PostStatus } from "./fields.js";

export interface ListingFacts {
  status: PostStatus;
  moderation: ModerationStatus;
  publishedAt: Date | null;
  suspended: boolean;
}

/** One predicate decides what the feed, the blogs, RSS and the newsletter may show. */
export function isListed(post: ListingFacts, now: Date): boolean {
  return (
    post.status === "published" &&
    post.moderation === "visible" &&
    post.publishedAt !== null &&
    post.publishedAt.getTime() <= now.getTime() &&
    !post.suspended
  );
}

/** The weight is the sum of the open reports, where a confirmed member counts twice. */
export function statusAfterPostReports(status: ModerationStatus, weight: number): ModerationStatus {
  if (status !== "visible") return status;
  return weight >= blogRules.hideAfterReports ? "hidden" : "visible";
}

export function statusAfterAction(action: ModerationAction): ModerationStatus {
  if (action === "hide") return "hidden";
  return action === "block" ? "blocked" : "visible";
}

export type WriteEligibility = "allowed" | "admin_only" | "blog_suspended" | "not_confirmed";

export function writeEligibility(facts: {
  kind: PostKind;
  role: "member" | "admin";
  suspended: boolean;
  confirmed: boolean;
}): WriteEligibility {
  if (facts.kind === "news") return facts.role === "admin" ? "allowed" : "admin_only";
  if (facts.suspended) return "blog_suspended";
  return facts.confirmed || facts.role === "admin" ? "allowed" : "not_confirmed";
}

export type StarEligibility = "allowed" | "own_post" | "already_starred" | "unavailable";

export function starEligibility(facts: {
  isAuthor: boolean;
  alreadyStarred: boolean;
  listed: boolean;
}): StarEligibility {
  if (!facts.listed) return "unavailable";
  if (facts.isAuthor) return "own_post";
  return facts.alreadyStarred ? "already_starred" : "allowed";
}

export function followEligibility(facts: { self: boolean }): "allowed" | "own_blog" {
  return facts.self ? "own_blog" : "allowed";
}

export type BlogReportEligibility = "allowed" | "own_content" | "already_reported" | "unavailable";

export function blogReportEligibility(facts: {
  isAuthor: boolean;
  alreadyReported: boolean;
  status: ModerationStatus;
}): BlogReportEligibility {
  if (facts.status === "blocked") return "unavailable";
  if (facts.isAuthor) return "own_content";
  return facts.alreadyReported ? "already_reported" : "allowed";
}

/** Authors keep their drafts and hidden posts; a blocked post is for moderators only. */
export function canReadPost(
  post: { listed: boolean; moderation: ModerationStatus },
  reader: { isAuthor: boolean; isAdmin: boolean },
): boolean {
  if (post.listed || reader.isAdmin) return true;
  return reader.isAuthor && post.moderation !== "blocked";
}

export function slugFor(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, blogRules.slugMaxLength)
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "post" : slug;
}
