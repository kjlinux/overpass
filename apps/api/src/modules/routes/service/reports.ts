import type { RouteReportInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { RoutesDeps } from "./context.js";

/** A member reports what readers can see, once, and never their own itinerary. */
export function reportService(deps: RoutesDeps) {
  return {
    report: async (account: Account, id: string, input: RouteReportInput): Promise<void> => {
      const route = await deps.repository.findListed(id);
      if (route === null) throw new AppError("not_found", 404);
      if (route.authorId === account.id) throw new AppError("own_content", 403);
      const stored = await deps.repository.insertReport(id, account.id, input.reason, deps.now());
      if (!stored) throw new AppError("already_reported", 409);
    },
  };
}
