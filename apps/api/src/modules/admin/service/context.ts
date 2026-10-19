import { adminPageSize } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { decodeAdminCursor, encodeAdminCursor } from "../cursor.js";
import type { AdminCursor } from "../cursor.js";
import type { Account } from "../../accounts/index.js";
import type { ContributionListener } from "../../ranking/index.js";
import type { AdminRepository } from "../model.js";

export type AdminDeps = {
  repository: AdminRepository;
  onContribution: ContributionListener;
  now: () => Date;
};

/** The role is read from the session at each request, so a demoted admin loses access at once. */
export function requireAdmin(account: Account): void {
  if (account.role !== "admin") throw new AppError("admin_only", 403);
}

export const cursorOf = (value: string | undefined): AdminCursor | undefined =>
  value === undefined ? undefined : decodeAdminCursor(value);

/** One page plus one row tells whether another page exists. */
export function pageOf<Row extends { id: string; cursorAt: string }, Item>(
  rows: Row[],
  map: (row: Row) => Item,
): { items: Item[]; next: string | null } {
  const page = rows.slice(0, adminPageSize);
  const last = page.at(-1);
  const more = rows.length > adminPageSize && last !== undefined;
  return {
    items: page.map(map),
    next: more ? encodeAdminCursor({ at: last.cursorAt, id: last.id }) : null,
  };
}
