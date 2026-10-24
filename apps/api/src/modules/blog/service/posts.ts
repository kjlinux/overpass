import { slugFor, writeEligibility } from "@overpass/shared";
import type { Language, PostCreateInput, PostKind, PostUpdateInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { PostPatch, PostRow } from "../model.js";
import { PostTranslationExists } from "../repository.js";
import { canEdit, mayRead, toDetail, toSummary } from "./context.js";
import type { BlogDeps, Reader } from "./context.js";

const ownPostsShown = 100;

async function requireWritable(deps: BlogDeps, account: Account, kind: PostKind): Promise<void> {
  const suspended = kind === "member" && (await deps.repository.isSuspended(account.id));
  const eligibility = writeEligibility({ kind, role: account.role, suspended });
  if (eligibility !== "allowed") throw new AppError(eligibility, 403);
}

/** The group of the post to translate, when this account may extend it in that language. */
async function translationGroup(
  deps: BlogDeps,
  account: Account,
  input: PostCreateInput,
): Promise<string | undefined> {
  if (input.translationOf === undefined) return undefined;
  const other = await deps.repository.findPost(input.translationOf);
  if (other === null || other.kind !== input.kind || !canEdit(other, account)) {
    throw new AppError("translation_invalid", 400);
  }
  if (other.language === input.language) throw new AppError("post_translation_exists", 409);
  return other.translationGroup;
}

/** A cover must be an image its author uploaded; null clears it. */
async function requireOwnCover(deps: BlogDeps, account: Account, id: string | null | undefined) {
  if (id === undefined || id === null || (await deps.ownsMedia(id, account.id))) return;
  throw new AppError("validation_failed", 400, { coverMediaId: "cover_invalid" });
}

async function create(deps: BlogDeps, account: Account, input: PostCreateInput) {
  await requireWritable(deps, account, input.kind);
  await requireOwnCover(deps, account, input.coverMediaId);
  const at = deps.now();
  const publishedAt = input.publishAt ?? (input.status === "published" ? at : null);
  try {
    const id = await deps.repository.insertPost({
      kind: input.kind,
      language: input.language,
      category: input.category,
      title: input.title,
      summary: input.summary,
      content: input.content,
      coverMediaId: input.coverMediaId,
      status: input.status,
      authorId: account.id,
      translationGroup: await translationGroup(deps, account, input),
      baseSlug: slugFor(input.title),
      publishedAt,
      at,
    });
    if (input.status === "published") await deps.onContribution([account.id]);
    return await detailFor(deps, id, account);
  } catch (error) {
    if (error instanceof PostTranslationExists) throw new AppError("post_translation_exists", 409);
    throw error;
  }
}

async function detailFor(deps: BlogDeps, id: string, reader: Reader) {
  const row = await deps.repository.findPost(id);
  if (row === null) throw new AppError("not_found", 404);
  return toDetail(deps, row, reader);
}

/** A post going live without a chosen date is dated now; a chosen date always wins. */
function patchOf(row: PostRow, input: PostUpdateInput, now: Date): PostPatch {
  const { publishAt, ...fields } = input;
  const status = input.status ?? row.status;
  const chosen = publishAt === undefined ? row.publishedAt : publishAt;
  const publishedAt = status === "published" && chosen === null ? now : chosen;
  return { ...fields, publishedAt };
}

async function editable(deps: BlogDeps, account: Account, id: string): Promise<PostRow> {
  const row = await deps.repository.findPost(id);
  if (row === null || !canEdit(row, account)) throw new AppError("not_found", 404);
  return row;
}

async function update(deps: BlogDeps, account: Account, id: string, input: PostUpdateInput) {
  const row = await editable(deps, account, id);
  await requireWritable(deps, account, row.kind);
  await requireOwnCover(deps, account, input.coverMediaId);
  await deps.repository.updatePost(id, patchOf(row, input, deps.now()), deps.now());
  await deps.onContribution([row.authorId]);
  return detailFor(deps, id, account);
}

async function read(deps: BlogDeps, slug: string, language: Language, reader: Reader) {
  const row = await deps.repository.findBySlug(slug, language);
  if (row === null || !mayRead(deps, row, reader)) throw new AppError("not_found", 404);
  return toDetail(deps, row, reader);
}

export function postService(deps: BlogDeps) {
  return {
    create: (account: Account, input: PostCreateInput) => create(deps, account, input),
    update: (account: Account, id: string, input: PostUpdateInput) =>
      update(deps, account, id, input),
    read: (slug: string, language: Language, reader: Reader) => read(deps, slug, language, reader),
    mine: async (account: Account) => ({
      items: (await deps.repository.postsOf(account.id, ownPostsShown)).map(toSummary),
      nextCursor: null,
    }),
    mineOne: async (account: Account, id: string) =>
      toDetail(deps, await editable(deps, account, id), account),
  };
}
