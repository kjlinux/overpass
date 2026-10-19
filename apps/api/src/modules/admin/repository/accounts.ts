import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { exactAt } from "../cursor.js";
import type { AccountRow, AdminRepository } from "../model.js";
import { at, before, rows, toDate, toDateOrNull } from "./sql.js";

type AccountPart = Pick<AdminRepository, "accounts" | "findAccount" | "suspend" | "reactivate">;

const columns = sql`id, handle, email, trim(country) as country, role,
  created_at as "createdAt", suspended_at as "suspendedAt", ${exactAt(sql`created_at`)} as "cursorAt"`;

type RawAccount = Omit<AccountRow, "createdAt" | "suspendedAt"> & {
  createdAt: Date | string;
  suspendedAt: Date | string | null;
};

const toAccount = (raw: RawAccount): AccountRow => ({
  ...raw,
  createdAt: toDate(raw.createdAt),
  suspendedAt: toDateOrNull(raw.suspendedAt),
});

async function accounts(db: Database, query: SQL): Promise<AccountRow[]> {
  return (await rows<RawAccount>(db, query)).map(toAccount);
}

/** LIKE wildcards typed by the admin are searched literally. */
function prefixMatch(prefix: string | undefined): SQL {
  if (prefix === undefined) return sql`true`;
  const pattern = `${prefix.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`;
  return sql`(lower(email) like ${pattern} escape '\\' or lower(handle) like ${pattern} escape '\\')`;
}

export function accountQueries(db: Database): AccountPart {
  const one = async (query: SQL) => (await accounts(db, query))[0] ?? null;
  return {
    accounts: (prefix, after, limit) =>
      accounts(
        db,
        sql`select ${columns} from users
          where ${prefixMatch(prefix)} and ${before(sql`created_at`, sql`id`, after)}
          order by created_at desc, id desc limit ${limit + 1}`,
      ),
    findAccount: (id) => one(sql`select ${columns} from users where id = ${id}`),
    suspend: (id, reason, when) =>
      one(sql`update users set suspended_at = ${at(when)}, suspended_reason = ${reason},
          session_version = session_version + 1, updated_at = ${at(when)}
        where id = ${id} and suspended_at is null and role <> 'admin'
        returning ${columns}`),
    reactivate: (id) =>
      one(sql`update users set suspended_at = null, suspended_reason = null
        where id = ${id} and suspended_at is not null returning ${columns}`),
  };
}
