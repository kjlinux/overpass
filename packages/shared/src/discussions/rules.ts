/** Moderation and permission rules of the discussions, independent of HTTP and SQL. */
export const discussionRules = { hideAfterReports: 2 } as const;

export const contentStatuses = ["visible", "hidden", "removed"] as const;
export type ContentStatus = (typeof contentStatuses)[number];

export const moderationDecisions = ["restore", "remove"] as const;
export type ModerationDecision = (typeof moderationDecisions)[number];

/** A report weight of two hides content until a moderator decides; a confirmed member weighs two. */
export function statusAfterReports(status: ContentStatus, weight: number): ContentStatus {
  if (status !== "visible") return status;
  return weight >= discussionRules.hideAfterReports ? "hidden" : "visible";
}

export function statusAfterDecision(decision: ModerationDecision): ContentStatus {
  return decision === "restore" ? "visible" : "removed";
}

export type ReportEligibility = "allowed" | "own_content" | "already_reported" | "unavailable";

export function reportEligibility(facts: {
  isAuthor: boolean;
  alreadyReported: boolean;
  status: ContentStatus;
}): ReportEligibility {
  if (facts.status === "removed") return "unavailable";
  if (facts.isAuthor) return "own_content";
  return facts.alreadyReported ? "already_reported" : "allowed";
}

export type VoteEligibility = "allowed" | "own_reply" | "already_voted" | "unavailable";

export function voteEligibility(facts: {
  isAuthor: boolean;
  alreadyVoted: boolean;
  status: ContentStatus;
}): VoteEligibility {
  if (facts.status !== "visible") return "unavailable";
  if (facts.isAuthor) return "own_reply";
  return facts.alreadyVoted ? "already_voted" : "allowed";
}

export type AcceptEligibility = "allowed" | "not_author" | "not_found" | "unavailable";

export function acceptEligibility(facts: {
  isThreadAuthor: boolean;
  replyInThread: boolean;
  replyStatus: ContentStatus;
}): AcceptEligibility {
  if (!facts.isThreadAuthor) return "not_author";
  if (!facts.replyInThread) return "not_found";
  return facts.replyStatus === "visible" ? "allowed" : "unavailable";
}

export type TransformEligibility =
  "allowed" | "not_author" | "not_resolved" | "already_transformed";

export function transformEligibility(facts: {
  isThreadAuthor: boolean;
  resolved: boolean;
  alreadyTransformed: boolean;
}): TransformEligibility {
  if (!facts.isThreadAuthor) return "not_author";
  if (!facts.resolved) return "not_resolved";
  return facts.alreadyTransformed ? "already_transformed" : "allowed";
}

/** Hidden content stays readable by its author and moderators; removed, by moderators only. */
export function canRead(
  status: ContentStatus,
  reader: { isAuthor: boolean; isAdmin: boolean },
): boolean {
  if (status === "visible" || reader.isAdmin) return true;
  return status === "hidden" && reader.isAuthor;
}
