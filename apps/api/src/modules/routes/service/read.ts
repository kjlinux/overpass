import { pageSizeMax } from "@overpass/shared";
import type { Language, RouteDetail, RouteListQuery, RoutePage } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import { decodeCursor, encodeCursor } from "../cursor.js";
import type { ListedRow, RouteRow } from "../model.js";
import { summaries, toService } from "./context.js";
import type { RoutesDeps } from "./context.js";

function nextCursor(rows: ListedRow[], limit: number, ranked: boolean): string | null {
  const last = rows.length > limit ? rows[limit - 1] : undefined;
  if (last === undefined) return null;
  return encodeCursor(
    ranked
      ? { mode: "rank", key: last.rank, id: last.id }
      : { mode: "date", key: last.updatedAt.toISOString(), id: last.id },
  );
}

/** The requested language when a translation exists, the available one otherwise. */
async function inLanguage(deps: RoutesDeps, row: RouteRow, language?: Language) {
  if (language === undefined || language === row.language) return { row, fallback: false };
  const siblingId = await deps.repository.sibling(row.translationGroup, language);
  const sibling = siblingId === null ? null : await deps.repository.findRow(siblingId);
  return sibling === null ? { row, fallback: true } : { row: sibling, fallback: false };
}

async function readRoute(
  deps: RoutesDeps,
  id: string,
  account: Account | null,
  language?: Language,
): Promise<RouteDetail> {
  const found = await deps.repository.findRow(id);
  if (found === null) throw new AppError("not_found", 404);
  const { row, fallback } = await inLanguage(deps, found, language);
  const [summary] = await summaries(deps, [row]);
  if (summary === undefined) throw new AppError("not_found", 404);
  return {
    ...summary,
    content: row.content,
    fallback,
    translations: await deps.repository.translations(row.translationGroup),
    ...(await deps.checks.community(row.id, row.authorId, account)),
  };
}

export function readService(deps: RoutesDeps) {
  return {
    read: (id: string, account: Account | null, language?: Language) =>
      readRoute(deps, id, account, language),
    list: async ({ cursor, q, ...filters }: RouteListQuery): Promise<RoutePage> => {
      const ranked = q !== undefined;
      const after =
        cursor === undefined ? undefined : decodeCursor(cursor, ranked ? "rank" : "date");
      const rows = await deps.repository.list({ ...filters, q, after });
      const items = await summaries(deps, rows.slice(0, filters.limit));
      return { items, nextCursor: nextCursor(rows, filters.limit, ranked) };
    },
    mine: async (account: Account) =>
      summaries(deps, await deps.repository.byAuthor(account.id, pageSizeMax * 2)),
    services: async () => (await deps.repository.services()).map(toService),
  };
}
