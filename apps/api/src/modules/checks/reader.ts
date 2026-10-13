import { checkEligibility, nextCheckAt } from "@overpass/shared";
import type { Pothole, RouteCheck, RouteState, RouteViewer } from "@overpass/shared";
import type { AnyColumn } from "drizzle-orm";
import type { Account, HandleDirectory } from "../accounts/index.js";
import type { ChecksRepository } from "./model.js";
import { toCheck, toPothole } from "./service/context.js";
import { stateColumns, stateCondition } from "./state.js";

const detailChecksLimit = 50;

export type ChecksReaderDeps = {
  repository: ChecksRepository;
  handles: HandleDirectory;
  now: () => Date;
};

export type RouteCommunity = { checks: RouteCheck[]; potholes: Pothole[]; viewer: RouteViewer };

async function viewerOf(
  { repository, now }: ChecksReaderDeps,
  routeId: string,
  authorId: string | null,
  account: Account | null,
): Promise<RouteViewer> {
  if (account === null) return { isAuthor: false, eligibility: "anonymous", nextCheckAt: null };
  const isAuthor = authorId === account.id;
  const lastCheckAt = await repository.lastCheckAt(account.id, routeId);
  const eligibility = checkEligibility({ isAuthor, lastCheckAt, now: now() });
  const next = eligibility === "too_soon" && lastCheckAt !== null ? nextCheckAt(lastCheckAt) : null;
  return { isAuthor, eligibility, nextCheckAt: next?.toISOString() ?? null };
}

async function communityOf(deps: ChecksReaderDeps, routeId: string) {
  const checks = await deps.repository.checksForRoute(routeId, detailChecksLimit);
  const potholes = await deps.repository.potholesForRoute(routeId);
  const ids = [...checks.map((check) => check.userId), ...potholes.map((p) => p.userId ?? "")];
  const names = await deps.handles(ids.filter((id) => id !== ""));
  const name = (id: string | null) => names.get(id ?? "") ?? "";
  return {
    checks: checks.map((check) => toCheck(check, name(check.userId))),
    potholes: potholes.map((pothole) => toPothole(pothole, name(pothole.userId))),
  };
}

/** What the routes module reads from this one: state SQL, the detail lists, contributions. */
export function createChecksReader(deps: ChecksReaderDeps) {
  return {
    stateColumns: (routeId: AnyColumn) => stateColumns(routeId, deps.now()),
    stateCondition: (routeId: AnyColumn, state: RouteState) =>
      stateCondition(routeId, deps.now(), state),
    community: async (
      routeId: string,
      authorId: string | null,
      account: Account | null,
    ): Promise<RouteCommunity> => ({
      ...(await communityOf(deps, routeId)),
      viewer: await viewerOf(deps, routeId, authorId, account),
    }),
    contributions: (userId: string) => deps.repository.countByUser(userId),
  };
}

export type ChecksReader = ReturnType<typeof createChecksReader>;
