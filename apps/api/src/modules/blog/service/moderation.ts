import { blogReportEligibility, statusAfterAction, statusAfterPostReports } from "@overpass/shared";
import type { BlogContentKind, ModerationAction, ModerationStatus } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import { readablePost, requireAdmin } from "./context.js";
import type { BlogDeps } from "./context.js";

type Target = { authorId: string | null; moderation: ModerationStatus; earner: string | null };

/** The content, and the account whose points depend on it staying visible. */
async function targetOf(deps: BlogDeps, kind: BlogContentKind, id: string): Promise<Target> {
  if (kind === "comment") {
    const comment = await deps.repository.findComment(id);
    if (comment === null) throw new AppError("not_found", 404);
    return { authorId: comment.authorId, moderation: comment.moderation, earner: null };
  }
  const post = await deps.repository.findPost(id);
  if (post === null) throw new AppError("not_found", 404);
  return { authorId: post.authorId, moderation: post.moderation, earner: post.authorId };
}

/** A member reports only what they can read; anything else is a 404, as for reading. */
async function reportable(deps: BlogDeps, account: Account, kind: BlogContentKind, id: string) {
  const target = await targetOf(deps, kind, id);
  const postId = kind === "post" ? id : (await deps.repository.findComment(id))?.postId;
  await readablePost(deps, postId ?? id, account);
  return target;
}

async function report(deps: BlogDeps, account: Account, kind: BlogContentKind, id: string) {
  const target = await reportable(deps, account, kind, id);
  const eligibility = blogReportEligibility({
    isAuthor: target.authorId === account.id,
    alreadyReported: (await deps.repository.reportedBy(account.id, kind, [id])).has(id),
    status: target.moderation,
  });
  if (eligibility === "own_content") throw new AppError("own_content", 403);
  if (eligibility === "unavailable") throw new AppError("content_unavailable", 409);
  const open = await deps.repository.report(kind, id, account.id, deps.now());
  if (eligibility === "already_reported" || open === null) {
    throw new AppError("already_reported", 409);
  }
  const moderation = statusAfterPostReports(target.moderation, open);
  if (moderation !== target.moderation) {
    await deps.repository.setModeration(kind, id, moderation);
    await deps.onContribution([target.earner]);
  }
  return { moderation };
}

/** A decision settles the open reports, so later reports start counting from zero. */
async function moderate(
  deps: BlogDeps,
  account: Account,
  target: { kind: BlogContentKind; id: string },
  action: ModerationAction,
) {
  requireAdmin(account);
  const { earner } = await targetOf(deps, target.kind, target.id);
  const moderation = statusAfterAction(action);
  const entry = { actorId: account.id, targetKind: target.kind, targetId: target.id, action };
  await deps.repository.atomically(async (repository, tx) => {
    await repository.setModeration(target.kind, target.id, moderation);
    await repository.resolveReports(target.kind, target.id, deps.now());
    await deps.log(entry, tx);
  });
  await deps.onContribution([earner]);
  return { moderation };
}

async function suspend(deps: BlogDeps, account: Account, handle: string, suspended: boolean) {
  requireAdmin(account);
  const member = await deps.repository.memberByHandle(handle);
  if (member === null) throw new AppError("not_found", 404);
  const action = suspended ? "suspend" : "reactivate";
  await deps.repository.atomically(async (repository, tx) => {
    await repository.setSuspended(member.id, account.id, suspended, deps.now());
    await deps.log({ actorId: account.id, targetKind: "blog", targetId: member.id, action }, tx);
  });
  await deps.onContribution([member.id]);
  return { suspended };
}

export function moderationService(deps: BlogDeps) {
  return {
    report: (account: Account, kind: BlogContentKind, id: string) =>
      report(deps, account, kind, id),
    moderate: (account: Account, kind: BlogContentKind, id: string, action: ModerationAction) =>
      moderate(deps, account, { kind, id }, action),
    suspend: (account: Account, handle: string, suspended: boolean) =>
      suspend(deps, account, handle, suspended),
  };
}
