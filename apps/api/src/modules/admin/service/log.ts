import { adminPageSize } from "@overpass/shared";
import type { AdminLogQuery, LogPage } from "@overpass/shared";
import type { Account } from "../../accounts/index.js";
import type { LogRow } from "../model.js";
import { cursorOf, pageOf, requireAdmin } from "./context.js";
import type { AdminDeps } from "./context.js";

const toEntry = (row: LogRow) => ({
  ...{ id: row.id, actor: row.actor, targetKind: row.targetKind, targetId: row.targetId },
  ...{ action: row.action, reason: row.reason },
  createdAt: row.createdAt.toISOString(),
});

export function logService(deps: AdminDeps) {
  return {
    log: async (account: Account, query: AdminLogQuery): Promise<LogPage> => {
      requireAdmin(account);
      const rows = await deps.repository.log(cursorOf(query.cursor), adminPageSize);
      return pageOf(rows, toEntry);
    },
  };
}
