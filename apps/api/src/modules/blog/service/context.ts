import { canReadPost, isListed } from "@overpass/shared";
import type { PostDetail, PostSummary } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { ModerationLog } from "../../admin/index.js";
import type { ContributionListener } from "../../ranking/index.js";
import type { BlogRepository, PostRow } from "../model.js";

export type BlogDeps = {
  repository: BlogRepository;
  onContribution: ContributionListener;
  log: ModerationLog;
  webOrigin: string;
  now: () => Date;
};

export type Reader = Account | null;

export const relatedCount = 3;

export const isAdmin = (reader: Reader): boolean => reader?.role === "admin";

export function requireAdmin(account: Account): void {
  if (account.role !== "admin") throw new AppError("admin_only", 403);
}

export const listedNow = (deps: BlogDeps, row: PostRow): boolean => isListed(row, deps.now());

/** The author of a member post, or any admin for news, may edit it. */
export const canEdit = (row: PostRow, account: Account): boolean =>
  row.authorId === account.id || (row.kind === "news" && account.role === "admin");

export function toSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    language: row.language,
    category: row.category,
    title: row.title,
    summary: row.summary,
    author:
      row.authorHandle === null
        ? null
        : { handle: row.authorHandle, country: row.authorCountry ?? "" },
    status: row.status,
    moderation: row.moderation,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    stars: row.starCount,
    comments: row.commentCount,
    translation: row.translation,
  };
}

export function mayRead(deps: BlogDeps, row: PostRow, reader: Reader): boolean {
  const facts = { listed: listedNow(deps, row), moderation: row.moderation };
  return canReadPost(facts, { isAuthor: row.authorId === reader?.id, isAdmin: isAdmin(reader) });
}

/** The post, or a 404 when this reader may not see it. */
export async function readablePost(deps: BlogDeps, id: string, reader: Reader): Promise<PostRow> {
  const row = await deps.repository.findPost(id);
  if (row === null || !mayRead(deps, row, reader)) throw new AppError("not_found", 404);
  return row;
}

async function viewerOf(deps: BlogDeps, row: PostRow, reader: Reader) {
  const { repository } = deps;
  if (reader === null) {
    return {
      isAuthor: false,
      isAdmin: false,
      starred: false,
      reported: false,
      followsAuthor: false,
    };
  }
  const [starred, reported, followsAuthor] = await Promise.all([
    repository.hasStarred(row.id, reader.id),
    repository.reportedBy(reader.id, "post", [row.id]),
    row.authorId === null ? false : repository.isFollowing(reader.id, row.authorId),
  ]);
  return {
    isAuthor: row.authorId === reader.id,
    isAdmin: isAdmin(reader),
    starred,
    reported: reported.has(row.id),
    followsAuthor,
  };
}

export async function toDetail(deps: BlogDeps, row: PostRow, reader: Reader): Promise<PostDetail> {
  const related = listedNow(deps, row)
    ? await deps.repository.related(row, deps.now(), relatedCount)
    : [];
  return {
    ...toSummary(row),
    content: row.content,
    related: related.map(toSummary),
    viewer: await viewerOf(deps, row, reader),
  };
}

/** One page plus one row tells whether another page exists. */
export function pageOf<Row, Item>(
  rows: Row[],
  limit: number,
  map: (row: Row) => Item,
  cursor: (row: Row) => string,
) {
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor = rows.length > limit && last !== undefined ? cursor(last) : null;
  return { items: page.map(map), nextCursor };
}
