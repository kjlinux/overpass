import { adminPageSize } from "@overpass/shared";
import type {
  AdminQueueQuery,
  QueuePage,
  RouteModerationInput,
  RouteModerationResult,
} from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { QueueRow } from "../model.js";
import { cursorOf, pageOf, requireAdmin } from "./context.js";
import type { AdminDeps } from "./context.js";

const toItem = (row: QueueRow) => ({
  ...{ kind: row.kind, id: row.id, title: row.title, excerpt: row.excerpt, author: row.author },
  ...{ reports: row.reports, status: row.status, path: row.path },
  lastReportAt: row.lastReportAt?.toISOString() ?? null,
});

async function queue(deps: AdminDeps, account: Account, query: AdminQueueQuery) {
  requireAdmin(account);
  const filter = { kind: query.kind, state: query.state };
  const rows = await deps.repository.queue(filter, cursorOf(query.cursor), adminPageSize);
  return pageOf(rows, toItem);
}

/** Restoring settles the reports, so the itinerary leaves the queue until reported again. */
async function moderateRoute(
  deps: AdminDeps,
  account: Account,
  id: string,
  input: RouteModerationInput,
): Promise<RouteModerationResult> {
  requireAdmin(account);
  const moderation = input.decision === "hide" ? "hidden" : "visible";
  const entry = { actorId: account.id, targetKind: "route", targetId: id } as const;
  const route = await deps.repository.atomically(async (repository) => {
    const found = await repository.setRouteModeration(id, moderation);
    if (found === undefined) return undefined;
    if (moderation === "visible") await repository.clearRouteReports(id);
    await repository.insertLog({ ...entry, action: input.decision, reason: input.reason });
    return found;
  });
  if (route === undefined) throw new AppError("not_found", 404);
  await deps.onContribution([route.authorId]);
  return { moderation };
}

export function queueService(deps: AdminDeps) {
  return {
    queue: (account: Account, query: AdminQueueQuery): Promise<QueuePage> =>
      queue(deps, account, query),
    moderateRoute: (account: Account, id: string, input: RouteModerationInput) =>
      moderateRoute(deps, account, id, input),
  };
}
