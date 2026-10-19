import { adminPageSize } from "@overpass/shared";
import type { AdminAccount, AdminAccountPage, AdminAccountsQuery } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { AccountRow } from "../model.js";
import { cursorOf, pageOf, requireAdmin } from "./context.js";
import type { AdminDeps } from "./context.js";

const toAccount = (row: AccountRow): AdminAccount => ({
  ...{ id: row.id, handle: row.handle, email: row.email, country: row.country, role: row.role },
  createdAt: row.createdAt.toISOString(),
  suspendedAt: row.suspendedAt?.toISOString() ?? null,
});

async function target(deps: AdminDeps, id: string): Promise<AccountRow> {
  const found = await deps.repository.findAccount(id);
  if (found === null) throw new AppError("not_found", 404);
  return found;
}

const onAccount = (account: Account, id: string) =>
  ({ actorId: account.id, targetKind: "account", targetId: id }) as const;

/** Never oneself and never another admin: the team cannot lock itself out. */
async function suspend(deps: AdminDeps, account: Account, id: string, reason: string) {
  requireAdmin(account);
  const found = await target(deps, id);
  if (found.id === account.id) throw new AppError("suspend_self", 403);
  if (found.role === "admin") throw new AppError("suspend_admin", 403);
  const suspended = await deps.repository.atomically(async (repository) => {
    const done = await repository.suspend(id, reason, deps.now());
    if (done === null) return null;
    await repository.insertLog({ ...onAccount(account, id), action: "suspend", reason });
    return done;
  });
  if (suspended === null) throw new AppError("already_suspended", 409);
  return toAccount(suspended);
}

async function reactivate(deps: AdminDeps, account: Account, id: string) {
  requireAdmin(account);
  await target(deps, id);
  const reactivated = await deps.repository.atomically(async (repository) => {
    const done = await repository.reactivate(id);
    if (done === null) return null;
    await repository.insertLog({ ...onAccount(account, id), action: "reactivate" });
    return done;
  });
  if (reactivated === null) throw new AppError("not_suspended", 409);
  return toAccount(reactivated);
}

export function accountService(deps: AdminDeps) {
  return {
    accounts: async (account: Account, query: AdminAccountsQuery): Promise<AdminAccountPage> => {
      requireAdmin(account);
      const rows = await deps.repository.accounts(query.q, cursorOf(query.cursor), adminPageSize);
      return pageOf(rows, toAccount);
    },
    suspend: (account: Account, id: string, reason: string) => suspend(deps, account, id, reason),
    reactivate: (account: Account, id: string) => reactivate(deps, account, id),
  };
}
