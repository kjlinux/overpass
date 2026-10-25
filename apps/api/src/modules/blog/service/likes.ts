import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import { readablePost } from "./context.js";
import type { BlogDeps } from "./context.js";

/** A liked comment must be one this account may read and that is not its own. */
async function likable(deps: BlogDeps, account: Account, commentId: string) {
  const comment = await deps.repository.findComment(commentId);
  if (comment === null) throw new AppError("not_found", 404);
  await readablePost(deps, comment.postId, account);
  if (comment.moderation !== "visible") throw new AppError("content_unavailable", 409);
  if (comment.authorId === account.id) throw new AppError("own_comment", 403);
  return comment;
}

async function like(deps: BlogDeps, account: Account, commentId: string) {
  await likable(deps, account, commentId);
  const likes = await deps.repository.addLike(commentId, account.id, deps.now());
  if (likes === null) throw new AppError("already_liked", 409);
  return { likes, liked: true };
}

async function unlike(deps: BlogDeps, account: Account, commentId: string) {
  if ((await deps.repository.findComment(commentId)) === null) throw new AppError("not_found", 404);
  return { likes: await deps.repository.removeLike(commentId, account.id), liked: false };
}

export function likeService(deps: BlogDeps) {
  return {
    likeComment: (account: Account, commentId: string) => like(deps, account, commentId),
    unlikeComment: (account: Account, commentId: string) => unlike(deps, account, commentId),
  };
}
