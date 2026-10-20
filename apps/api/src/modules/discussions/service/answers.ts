import { acceptEligibility, voteEligibility } from "@overpass/shared";
import type { AcceptInput, ReplyCreateInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import { readableThread } from "./context.js";
import type { DiscussionsDeps } from "./context.js";
import { threadDetail } from "./detail.js";
import { toReply } from "./replies.js";
import { maskWithin } from "./masking.js";

async function visibleThread(deps: DiscussionsDeps, id: string, account: Account) {
  const thread = await readableThread(deps, id, account);
  if (thread.status !== "visible") throw new AppError("content_unavailable", 409);
  return thread;
}

async function reply(
  deps: DiscussionsDeps,
  account: Account,
  threadId: string,
  input: ReplyCreateInput,
) {
  await visibleThread(deps, threadId, account);
  const content = maskWithin("content", input.content);
  const created = await deps.repository.insertReply({
    ...{ threadId, authorId: account.id, content },
    at: deps.now(),
  });
  const facts = { names: new Map([[account.id, account.handle]]), voted: new Set<string>() };
  return toReply(created, account, { ...facts, reported: new Set<string>() }, null);
}

async function vote(deps: DiscussionsDeps, account: Account, replyId: string) {
  const target = await deps.repository.findReply(replyId);
  if (target === null || target.status === "removed") throw new AppError("not_found", 404);
  await visibleThread(deps, target.threadId, account);
  const eligibility = voteEligibility({
    isAuthor: target.authorId === account.id,
    alreadyVoted: (await deps.repository.votedBy(account.id, [replyId])).has(replyId),
    status: target.status,
  });
  if (eligibility === "own_reply") throw new AppError("own_reply", 403);
  if (eligibility === "unavailable") throw new AppError("content_unavailable", 409);
  const useful = await deps.repository.insertVote(replyId, account.id, deps.now());
  if (eligibility === "already_voted" || useful === null) throw new AppError("already_voted", 409);
  await deps.onContribution([target.authorId]);
  return { id: replyId, useful };
}

/** Accepting another reply moves the 5 points: both authors are recomputed. */
async function accept(
  deps: DiscussionsDeps,
  account: Account,
  threadId: string,
  input: AcceptInput,
) {
  const thread = await visibleThread(deps, threadId, account);
  const chosen = await deps.repository.findReply(input.reply);
  const eligibility = acceptEligibility({
    isThreadAuthor: thread.authorId === account.id,
    replyInThread: chosen !== null && chosen.threadId === threadId,
    replyStatus: chosen?.status ?? "removed",
  });
  if (eligibility === "not_author") throw new AppError("not_thread_author", 403);
  if (eligibility === "not_found" || chosen === null) throw new AppError("not_found", 404);
  if (eligibility === "unavailable") throw new AppError("content_unavailable", 409);
  const previousId = thread.acceptedReplyId;
  const previous = previousId === null ? null : await deps.repository.findReply(previousId);
  await deps.repository.setAccepted(threadId, chosen.id);
  await deps.onContribution([previous?.authorId, chosen.authorId]);
  return threadDetail(deps, await readableThread(deps, threadId, account), account);
}

export function answerService(deps: DiscussionsDeps) {
  return {
    reply: (account: Account, threadId: string, input: ReplyCreateInput) =>
      reply(deps, account, threadId, input),
    vote: (account: Account, replyId: string) => vote(deps, account, replyId),
    accept: (account: Account, threadId: string, input: AcceptInput) =>
      accept(deps, account, threadId, input),
  };
}
