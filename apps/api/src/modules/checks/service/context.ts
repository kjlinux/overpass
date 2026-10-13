import type { MyCheck, Pothole, RouteCheck } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { HandleDirectory } from "../../accounts/index.js";
import type { CheckRecord, ChecksRepository, PotholeRecord, RouteDirectory } from "../model.js";

export type ChecksDeps = {
  repository: ChecksRepository;
  routes: RouteDirectory;
  handles: HandleDirectory;
  now: () => Date;
};

export function toCheck(record: CheckRecord, handle: string): RouteCheck {
  return {
    id: record.id,
    handle,
    country: record.country,
    environment: record.environment,
    checkedAt: record.checkedAt.toISOString(),
  };
}

export function toMyCheck(record: CheckRecord, title: string): MyCheck {
  return {
    id: record.id,
    country: record.country,
    environment: record.environment,
    checkedAt: record.checkedAt.toISOString(),
    route: { id: record.routeId, title },
  };
}

export function toPothole(record: PotholeRecord, handle: string): Pothole {
  return {
    id: record.id,
    handle,
    description: record.description,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/** The live route's facts, or a 404 for an unknown or deleted route. */
export async function liveRoute(routes: RouteDirectory, routeId: string) {
  const facts = await routes.facts(routeId);
  if (facts === null) throw new AppError("not_found", 404);
  return facts;
}
