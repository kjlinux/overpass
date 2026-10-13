import { checkService } from "./service/checks.js";
import type { ChecksDeps } from "./service/context.js";
import { potholeService } from "./service/potholes.js";

export type { ChecksDeps } from "./service/context.js";

/** Business rules of the checks module, independent of HTTP and SQL. */
export function createChecksService(deps: ChecksDeps) {
  return { ...checkService(deps), ...potholeService(deps) };
}

export type ChecksService = ReturnType<typeof createChecksService>;
