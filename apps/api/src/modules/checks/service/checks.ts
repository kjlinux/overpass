import { checkEligibility, routeRules } from "@overpass/shared";
import type { CheckCreateInput, MyCheck } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import { confirmCoverageIfClear, liveRoute, toCheck, toMyCheck } from "./context.js";
import type { ChecksDeps } from "./context.js";

const day = 86_400_000;
const myChecksLimit = 100;

export function checkService(deps: ChecksDeps) {
  const { repository, routes, now } = deps;
  return {
    createCheck: async (account: Account, routeId: string, input: CheckCreateInput) => {
      const facts = await liveRoute(routes, routeId);
      const at = now();
      const eligibility = checkEligibility({
        isAuthor: facts.authorId === account.id,
        lastCheckAt: await repository.lastCheckAt(account.id, routeId),
        now: at,
      });
      if (eligibility === "own_route") throw new AppError("own_route", 403);
      if (eligibility === "too_soon") throw new AppError("check_too_soon", 409);
      const since = new Date(at.getTime() - routeRules.checkCooldownDays * day);
      const check = { routeId, userId: account.id, ...input, checkedAt: at };
      const created = await repository.insertCheckUnlessRecent(check, since);
      if (created === null) throw new AppError("check_too_soon", 409);
      await confirmCoverageIfClear(deps, routeId);
      await deps.onContribution([account.id]);
      return toCheck(created, account.handle);
    },

    myChecks: async (account: Account): Promise<MyCheck[]> => {
      const records = await repository.checksByUser(account.id, myChecksLimit);
      const titles = await routes.titles(records.map((record) => record.routeId));
      return records.flatMap((record) => {
        const title = titles.get(record.routeId);
        return title === undefined ? [] : [toMyCheck(record, title)];
      });
    },
  };
}
