import type { Role } from "@overpass/shared";
import { inArray } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { Database } from "../../db/client.js";
import { AppError } from "../../http/app-error.js";
import type { SessionCookies } from "./cookies.js";
import type { AccountsService } from "./service.js";
import { users } from "./tables.js";

/** What other modules may know about the signed-in account. */
export type Account = { id: string; handle: string; country: string; role: Role };

/** The account behind a request's web session, or null. */
export type AccountResolver = (request: FastifyRequest) => Promise<Account | null>;

/** Public handles of a set of accounts; deleted accounts are simply absent. */
export type HandleDirectory = (ids: string[]) => Promise<Map<string, string>>;

export function accountResolver(
  service: AccountsService,
  cookies: SessionCookies,
): AccountResolver {
  return async (request) => {
    const session = cookies.read(request);
    const user = session === undefined ? null : await service.authenticateSession(session);
    if (user === null) return null;
    return { id: user.id, handle: user.handle, country: user.country, role: user.role };
  };
}

export function handleDirectory(db: Database): HandleDirectory {
  return async (ids) => {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await db
      .select({ id: users.id, handle: users.handle })
      .from(users)
      .where(inArray(users.id, unique));
    return new Map(rows.map((row) => [row.id, row.handle]));
  };
}

/** The signed-in account, or a 401 for an anonymous request. */
export async function requireAccount(
  resolve: AccountResolver,
  request: FastifyRequest,
): Promise<Account> {
  const account = await resolve(request);
  if (account === null) throw new AppError("unauthorized", 401);
  return account;
}
