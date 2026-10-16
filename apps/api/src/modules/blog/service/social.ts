import { followEligibility, starEligibility } from "@overpass/shared";
import type { CommentCreateInput, PostComment } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { decodeDateCursor, encodeDateCursor } from "../../../http/date-cursor.js";
import type { Account } from "../../accounts/index.js";
import type { CommentRow } from "../model.js";
import { isAdmin, listedNow, pageOf, readablePost } from "./context.js";
import type { BlogDeps, Reader } from "./context.js";

const commentsPerPage = 50;

async function star(deps: BlogDeps, account: Account, postId: string) {
  const row = await readablePost(deps, postId, account);
  const eligibility = starEligibility({
    isAuthor: row.authorId === account.id,
    alreadyStarred: false,
    listed: listedNow(deps, row),
  });
  if (eligibility === "unavailable") throw new AppError("content_unavailable", 409);
  if (eligibility === "own_post") throw new AppError("own_post", 403);
  const stars = await deps.repository.addStar(postId, account.id, deps.now());
  if (stars === null) throw new AppError("already_starred", 409);
  await deps.onContribution([row.authorId]);
  return { stars, starred: true };
}

async function unstar(deps: BlogDeps, account: Account, postId: string) {
  const row = await readablePost(deps, postId, account);
  const stars = await deps.repository.removeStar(postId, account.id);
  if (stars !== null) await deps.onContribution([row.authorId]);
  return { stars: stars ?? row.starCount, starred: false };
}

/** Hidden or blocked text stays with its author and the moderators. */
function toComment(row: CommentRow, reader: Reader, reported: Set<string>): PostComment {
  const isAuthor = row.authorId === reader?.id;
  const shown = row.moderation === "visible" || isAuthor || isAdmin(reader);
  return {
    id: row.id,
    author: row.authorHandle,
    content: shown ? row.content : null,
    moderation: row.moderation,
    createdAt: row.createdAt.toISOString(),
    viewer: { isAuthor, reported: reported.has(row.id) },
  };
}

async function comment(
  deps: BlogDeps,
  account: Account,
  postId: string,
  input: CommentCreateInput,
) {
  const row = await readablePost(deps, postId, account);
  if (!listedNow(deps, row)) throw new AppError("not_found", 404);
  const created = await deps.repository.insertComment(
    postId,
    account.id,
    input.content,
    deps.now(),
  );
  return toComment(created, account, new Set());
}

async function comments(
  deps: BlogDeps,
  postId: string,
  cursor: string | undefined,
  reader: Reader,
) {
  await readablePost(deps, postId, reader);
  const after = cursor === undefined ? undefined : decodeDateCursor(cursor);
  const rows = await deps.repository.comments(postId, after, commentsPerPage);
  const ids = rows.map((row) => row.id);
  const reported =
    reader === null
      ? new Set<string>()
      : await deps.repository.reportedBy(reader.id, "comment", ids);
  return pageOf(
    rows,
    commentsPerPage,
    (row) => toComment(row, reader, reported),
    (row) => encodeDateCursor({ at: row.createdAt, id: row.id }),
  );
}

async function followee(deps: BlogDeps, account: Account, handle: string) {
  const member = await deps.repository.memberByHandle(handle);
  if (member === null) throw new AppError("not_found", 404);
  if (followEligibility({ self: member.id === account.id }) === "own_blog") {
    throw new AppError("own_blog", 403);
  }
  return member;
}

async function setFollow(deps: BlogDeps, account: Account, handle: string, follows: boolean) {
  const member = await followee(deps, account, handle);
  if (follows) await deps.repository.follow(account.id, member.id, deps.now());
  else await deps.repository.unfollow(account.id, member.id);
  return { follows, followers: await deps.repository.followers(member.id) };
}

export function socialService(deps: BlogDeps) {
  return {
    star: (account: Account, postId: string) => star(deps, account, postId),
    unstar: (account: Account, postId: string) => unstar(deps, account, postId),
    comment: (account: Account, postId: string, input: CommentCreateInput) =>
      comment(deps, account, postId, input),
    comments: (postId: string, cursor: string | undefined, reader: Reader) =>
      comments(deps, postId, cursor, reader),
    follow: (account: Account, handle: string) => setFollow(deps, account, handle, true),
    unfollow: (account: Account, handle: string) => setFollow(deps, account, handle, false),
    following: async (account: Account) =>
      (await deps.repository.following(account.id)).map((member) => ({
        handle: member.handle,
        country: member.country,
        followedAt: member.followedAt.toISOString(),
      })),
  };
}
