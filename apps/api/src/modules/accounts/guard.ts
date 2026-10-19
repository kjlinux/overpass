import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "../../http/app-error.js";
import type { SessionCookies } from "./cookies.js";
import { refuseSuspended } from "./service/auth.js";
import type { UserRecord } from "./model.js";
import type { AccountsService } from "./service.js";

declare module "fastify" {
  interface FastifyRequest {
    account: UserRecord | null;
  }
}

/** "session" for the web app; "session-or-token" also accepts a personal bearer token. */
export type AuthMode = "session" | "session-or-token";

function bearerOf(request: FastifyRequest): string | undefined {
  const [scheme, value] = (request.headers.authorization ?? "").split(" ");
  return scheme?.toLowerCase() === "bearer" && value !== undefined ? value : undefined;
}

export function authGuard(app: FastifyInstance, service: AccountsService, cookies: SessionCookies) {
  app.decorateRequest("account", null);
  return (mode: AuthMode) => async (request: FastifyRequest) => {
    const session = cookies.read(request);
    const bearer = mode === "session-or-token" ? bearerOf(request) : undefined;
    const account =
      (session === undefined ? null : await service.authenticateSession(session)) ??
      (bearer === undefined ? null : await service.authenticateToken(bearer));
    if (account === null) throw new AppError("unauthorized", 401);
    request.account = refuseSuspended(account);
  };
}

/** The account set by the guard; calling it on an open route is a programming error. */
export function currentAccount(request: FastifyRequest): UserRecord {
  if (request.account === null) throw new AppError("unauthorized", 401);
  return request.account;
}
