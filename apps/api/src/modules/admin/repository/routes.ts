import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { AdminRepository } from "../model.js";
import { rows } from "./sql.js";

type RoutePart = Pick<AdminRepository, "setRouteModeration" | "clearRouteReports">;

export function routeQueries(db: Database): RoutePart {
  return {
    setRouteModeration: async (id, moderation) => {
      const [row] = await rows<{ authorId: string | null }>(
        db,
        sql`update routes set moderation = ${moderation} where id = ${id} and deleted_at is null
          returning author_id as "authorId"`,
      );
      return row;
    },
    clearRouteReports: async (id) => {
      await db.execute(sql`delete from route_reports where route_id = ${id}`);
    },
  };
}
