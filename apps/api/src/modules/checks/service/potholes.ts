import type { PotholeCreateInput, PotholeUpdateInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import { confirmCoverageIfClear, liveRoute, toPothole } from "./context.js";
import type { ChecksDeps } from "./context.js";

export function potholeService(deps: ChecksDeps) {
  const { repository, routes, handles, now } = deps;
  return {
    reportPothole: async (account: Account, routeId: string, input: PotholeCreateInput) => {
      await liveRoute(routes, routeId);
      const pothole = { routeId, userId: account.id, description: input.description, at: now() };
      const created = await repository.insertPothole(pothole);
      if (created === null) throw new AppError("pothole_exists", 409);
      return toPothole(created, account.handle);
    },

    /** Only the author of the route, or an admin, confirms or resolves a reported trap. */
    updatePothole: async (account: Account, potholeId: string, input: PotholeUpdateInput) => {
      const pothole = await repository.findPothole(potholeId);
      if (pothole === null) throw new AppError("not_found", 404);
      const facts = await liveRoute(routes, pothole.routeId);
      if (facts.authorId !== account.id && account.role !== "admin") {
        throw new AppError("forbidden", 403);
      }
      const updated = await repository.setPotholeStatus(potholeId, input.status, now());
      if (updated === null) throw new AppError("pothole_exists", 409);
      await confirmCoverageIfClear(deps, pothole.routeId);
      const reporter = updated.userId ?? "";
      const names = await handles(reporter === "" ? [] : [reporter]);
      return toPothole(updated, names.get(reporter) ?? "");
    },
  };
}
