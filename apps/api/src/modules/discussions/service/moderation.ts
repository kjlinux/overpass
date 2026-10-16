import { reportEligibility, statusAfterDecision, statusAfterReports } from "@overpass/shared";
import type {
  ContentKind,
  ContentStatus,
  ModerationDecision,
  ModerationItem,
} from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { DiscussionsDeps } from "./context.js";

const queueSize = 100;

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
  const status = statusAfterReports(target.status, await repository.openReports(kind, id));
  if (status !== target.status) {
    await repository.setStatus(kind, id, status);
    await deps.onContribution(target.earners);
  }
  return { status };
}

async function queue(deps: DiscussionsDeps, account: Account): Promise<ModerationItem[]> {
  requireAdmin(account);
  const rows = await deps.repository.moderationQueue(queueSize);
  const authors = rows.flatMap((row) => (row.authorId === null ? [] : [row.authorId]));
  const names = await deps.handles(authors);
  return rows.map(({ authorId, lastReportAt, ...row }) => ({
    ...row,
    author: names.get(authorId ?? "") ?? "",
    lastReportAt: lastReportAt.toISOString(),
  }));
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
  await deps.repository.setStatus(target.kind, target.id, status);
  await deps.repository.resolveReports(target.kind, target.id, deps.now());
  await deps.onContribution(earners);
  return { status };
}

export function moderationService(deps: DiscussionsDeps) {
  return {
    report: (account: Account, kind: ContentKind, id: string) => report(deps, account, kind, id),
    queue: (account: Account) => queue(deps, account),
    decide: (account: Account, kind: ContentKind, id: string, decision: ModerationDecision) =>
      decide(deps, account, { kind, id }, decision),
  };
}
