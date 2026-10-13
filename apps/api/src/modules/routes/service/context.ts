import { routeState } from "@overpass/shared";
import type { RouteSummary, Service } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account, HandleDirectory } from "../../accounts/index.js";
import type { ChecksReader } from "../../checks/index.js";
import type { RouteRecord, RouteRow, RoutesRepository, ServiceRecord } from "../model.js";

export type RoutesDeps = {
  repository: RoutesRepository;
  checks: ChecksReader;
  handles: HandleDirectory;
  now: () => Date;
};

export function toSummary(row: RouteRow, author: string): RouteSummary {
  return {
    id: row.id,
    service: row.service,
    country: row.country,
    stack: row.stack,
    language: row.language,
    title: row.title,
    author,
    version: row.version,
    state: routeState(row),
    recentCheckers: row.recentCheckers,
    unresolvedPotholes: row.unresolvedPotholes,
    lastCheckAt: row.lastCheckAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toService(record: ServiceRecord): Service {
  const { slug, name, category, simulated } = record;
  const coverage = record.coverage.map((entry) => ({
    ...entry,
    confirmedAt: entry.confirmedAt?.toISOString() ?? null,
  }));
  return { slug, name, category, simulated, countries: coverage.map((c) => c.country), coverage };
}

/** Summaries with the handles of their authors, fetched in one query. */
export async function summaries(deps: RoutesDeps, rows: RouteRow[]): Promise<RouteSummary[]> {
  const authors = rows.flatMap((row) => (row.authorId === null ? [] : [row.authorId]));
  const names = await deps.handles(authors);
  return rows.map((row) => toSummary(row, names.get(row.authorId ?? "") ?? ""));
}

/** The author edits and deletes; an admin may too, for moderation. */
export function assertCanEdit(route: RouteRecord, account: Account): void {
  if (route.authorId !== account.id && account.role !== "admin") {
    throw new AppError("forbidden", 403);
  }
}

export async function serviceIdOf(repository: RoutesRepository, slug: string): Promise<string> {
  const service = await repository.serviceBySlug(slug);
  if (service === null) {
    throw new AppError("validation_failed", 400, { service: "service_invalid" });
  }
  return service.id;
}
