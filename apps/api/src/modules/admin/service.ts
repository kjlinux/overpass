import { accountService } from "./service/accounts.js";
import type { AdminDeps } from "./service/context.js";
import { logService } from "./service/log.js";
import { queueService } from "./service/queue.js";

export type { AdminDeps } from "./service/context.js";

/** Business rules of the admin module, independent of HTTP and SQL. */
export function createAdminService(deps: AdminDeps) {
  return { ...queueService(deps), ...accountService(deps), ...logService(deps) };
}

export type AdminService = ReturnType<typeof createAdminService>;
