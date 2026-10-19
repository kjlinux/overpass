import type { RoutesDeps } from "./service/context.js";
import { readService } from "./service/read.js";
import { reportService } from "./service/reports.js";
import { writeService } from "./service/write.js";

export type { RoutesDeps } from "./service/context.js";

/** Business rules of the routes module, independent of HTTP and SQL. */
export function createRoutesService(deps: RoutesDeps) {
  return { ...readService(deps), ...writeService(deps), ...reportService(deps) };
}

export type RoutesService = ReturnType<typeof createRoutesService>;
