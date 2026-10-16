import type { Database } from "../../db/client.js";
import type { ChecksReader } from "../checks/index.js";
import type { RoutesRepository } from "./model.js";
import { serviceQueries } from "./repository/coverage.js";
import { linkQueries } from "./repository/links.js";
import { listRoutes } from "./repository/list.js";
import { readQueries } from "./repository/read.js";
import { insertRoute, softDelete, updateRoute } from "./repository/write.js";

/** PostgreSQL implementation of the routes storage port, through Drizzle. */
export function createRoutesRepository(db: Database, checks: ChecksReader): RoutesRepository {
  return {
    ...serviceQueries(db),
    insertRoute: (route) => insertRoute(db, route),
    updateRoute: (id, patch, editorId, at) => updateRoute(db, id, patch, editorId, at),
    softDelete: (id, at) => softDelete(db, id, at),
    list: (filters) => listRoutes(db, checks, filters),
    ...readQueries(db, checks),
    ...linkQueries(db),
  };
}
