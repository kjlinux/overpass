import type { ThreadState, ThreadSummary, TopicSlug } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account, HandleDirectory } from "../../accounts/index.js";
import type { ModerationLog } from "../../admin/index.js";
import type { ContributionListener, TrustSource } from "../../ranking/index.js";
import type { DiscussionsRepository, RouteLookup, ThreadRecord, ThreadRow } from "../model.js";

export type DiscussionsDeps = {
  repository: DiscussionsRepository;
  routes: RouteLookup;
  handles: HandleDirectory;
  onContribution: ContributionListener;
  trust: TrustSource;
  log: ModerationLog;
  now: () => Date;
};

export type Reader = Account | null;

export const isAdmin = (reader: Reader): boolean => reader?.role === "admin";

export const stateOf = (thread: ThreadRecord): ThreadState =>
  thread.acceptedReplyId === null ? "open" : "resolved";

type Lookups = {
  names: Map<string, string>;
  titles: Map<string, string>;
  services: Map<string, { slug: string; name: string }>;
};

function linkedRoute(row: ThreadRow, titles: Map<string, string>) {
  const title = row.routeId === null ? undefined : titles.get(row.routeId);
  return row.routeId === null || title === undefined ? null : { id: row.routeId, title };
}

export function toSummary(row: ThreadRow, lookups: Lookups): ThreadSummary {
  const service = row.serviceId === null ? undefined : lookups.services.get(row.serviceId);
  return {
    id: row.id,
    topic: row.topic as TopicSlug,
    title: row.title,
    author: lookups.names.get(row.authorId ?? "") ?? "",
    language: row.language,
    country: row.country,
    stack: row.stack,
    route: linkedRoute(row, lookups.titles),
    service: service ?? null,
    state: stateOf(row),
    status: row.status,
    replies: row.replies,
    createdAt: row.createdAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
  };
}

const idsOf = (rows: ThreadRow[], pick: (row: ThreadRow) => string | null): string[] =>
  rows.flatMap((row) => {
    const id = pick(row);
    return id === null ? [] : [id];
  });

/** Summaries with handles, route titles and service names fetched in one query each. */
export async function summaries(
  deps: DiscussionsDeps,
  rows: ThreadRow[],
): Promise<ThreadSummary[]> {
  const [names, titles, services] = await Promise.all([
    deps.handles(idsOf(rows, (row) => row.authorId)),
    deps.routes.titles(idsOf(rows, (row) => row.routeId)),
    deps.routes.services(idsOf(rows, (row) => row.serviceId)),
  ]);
  return rows.map((row) => toSummary(row, { names, titles, services }));
}

/** The thread, or a 404 when it is unknown or removed for a reader who is not a moderator. */
export async function readableThread(
  deps: DiscussionsDeps,
  id: string,
  reader: Reader,
): Promise<ThreadRow> {
  const thread = await deps.repository.findThread(id);
  if (thread === null || (thread.status === "removed" && !isAdmin(reader))) {
    throw new AppError("not_found", 404);
  }
  return thread;
}
