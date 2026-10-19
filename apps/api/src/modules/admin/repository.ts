import { atomic } from "../../db/client.js";
import type { Database } from "../../db/client.js";
import type { AdminRepository } from "./model.js";
import { accountQueries } from "./repository/accounts.js";
import { logQueries } from "./repository/log.js";
import { queueQueries } from "./repository/queue.js";
import { routeQueries } from "./repository/routes.js";

/** PostgreSQL implementation of the admin storage port. */
export function createAdminRepository(db: Database): AdminRepository {
  return {
    ...queueQueries(db),
    ...routeQueries(db),
    ...accountQueries(db),
    ...logQueries(db),
    atomically: atomic(db, createAdminRepository),
  };
}
