import type { LoginInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { UserRecord } from "../model.js";
import { verifyPassword } from "../passwords.js";
import type { ServiceContext } from "./context.js";

export type SessionResult = { user: UserRecord; session: string };

/** Suspension is checked after the credentials, so it never reveals whether an address exists. */
export function refuseSuspended<User extends UserRecord | null>(user: User): User {
  if (user !== null && user.suspendedAt !== null) throw new AppError("account_suspended", 403);
  return user;
}

/** A new session for a member, signed with the current session version. */
export async function openSession(ctx: ServiceContext, user: UserRecord): Promise<SessionResult> {
  return { user, session: await ctx.tokens.signSession(user) };
}

export function authService(ctx: ServiceContext) {
  const authenticateSession = async (token: string) => {
    const claims = await ctx.tokens.verifySession(token);
    if (claims === null) return null;
    const user = await ctx.repository.findUserById(claims.userId);
    return user?.sessionVersion === claims.version ? user : null;
  };

  return {
    login: async (input: LoginInput) => {
      const user = await ctx.repository.findUserByEmail(input.email);
      const valid = await verifyPassword(user?.passwordHash ?? null, input.password);
      if (user === null || !valid) throw new AppError("invalid_credentials", 401);
      return openSession(ctx, refuseSuspended(user));
    },

    authenticateSession,

    /** Stateless sessions can only be ended by moving the version, so every copy stops working. */
    logout: async (token: string) => {
      const user = await authenticateSession(token);
      if (user !== null) await ctx.repository.rotateCredentials(user.id, {});
    },
  };
}
