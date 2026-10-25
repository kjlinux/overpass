import {
  reportEligibility,
  reportWeight,
  statusAfterDecision,
  statusAfterReports,
} from "@overpass/shared";
import type { ContentKind, ContentStatus, ModerationDecision } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { DiscussionsDeps } from "./context.js";

type Target = {
  authorId: string | null;
  status: ContentStatus;
  earners: (string | null | undefined)[];
};

/** The content, and the accounts whose points depend on it staying visible. */
async function targetOf(deps: DiscussionsDeps, kind: ContentKind, id: string): Promise<Target> {
  if (kind === "reply") {
    const reply = await deps.repository.findReply(id);
    if (reply === null) throw new AppError("not_found", 404);
    return { authorId: reply.authorId, status: reply.status, earners: [reply.authorId] };
  }
  const thread = await deps.repository.findThread(id);
  if (thread === null) throw new AppError("not_found", 404);
  const acceptedId = thread.acceptedReplyId;
  const accepted = acceptedId === null ? null : await deps.repository.findReply(acceptedId);
  return { authorId: thread.authorId, status: thread.status, earners: [accepted?.authorId] };
}

/** Open reports summed by weight, so one confirmed member is enough to hide content. */
async function weightOf(deps: DiscussionsDeps, kind: ContentKind, id: string): Promise<number> {
  const reporters = await deps.repository.openReporters(kind, id);
  const confirmed = await deps.trust.confirmedAmong(reporters);
  return reporters.reduce((total, userId) => total + reportWeight(confirmed.has(userId)), 0);
}

function requireAdmin(account: Account): void {
  if (account.role !== "admin") throw new AppError("admin_only", 403);
}

async function report(deps: DiscussionsDeps, account: Account, kind: ContentKind, id: string) {
  const { repository } = deps;
  const target = await targetOf(deps, kind, id);
  const eligibility = reportEligibility({
    isAuthor: target.authorId === account.id,
    alreadyReported: (await repository.reportedBy(account.id, kind, [id])).has(id),
    status: target.status,
  });
  if (eligibility === "own_content") throw new AppError("own_content", 403);
  if (eligibility === "unavailable") throw new AppError("content_unavailable", 409);
  const inserted = await repository.insertReport(kind, id, account.id, deps.now());
  if (eligibility === "already_reported" || !inserted) throw new AppError("already_reported", 409);
  const status = statusAfterReports(target.status, await weightOf(deps, kind, id));
  if (status !== target.status) {
    await repository.setStatus(kind, id, status);
    await deps.onContribution(target.earners);
  }
  return { status };
}

/** A decision settles the open reports, so later reports start counting from zero. */
async function decide(
  deps: DiscussionsDeps,
  account: Account,
  target: { kind: ContentKind; id: string },
  decision: ModerationDecision,
) {
  requireAdmin(account);
  const { earners } = await targetOf(deps, target.kind, target.id);
  const status = statusAfterDecision(decision);
  const entry = { actorId: account.id, targetKind: target.kind, targetId: target.id };
  await deps.repository.atomically(async (repository, tx) => {
    await repository.setStatus(target.kind, target.id, status);
    await repository.resolveReports(target.kind, target.id, deps.now());
    await deps.log({ ...entry, action: decision }, tx);
  });
  await deps.onContribution(earners);
  return { status };
}

export function moderationService(deps: DiscussionsDeps) {
  return {
    report: (account: Account, kind: ContentKind, id: string) => report(deps, account, kind, id),
    decide: (account: Account, kind: ContentKind, id: string, decision: ModerationDecision) =>
      decide(deps, account, { kind, id }, decision),
  };
}
