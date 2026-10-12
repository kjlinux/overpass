import type { FastifyInstance } from "fastify";
import type { SessionCookies } from "./cookies.js";
import { authGuard } from "./guard.js";
import { authRoutes, recoveryRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { tokenRoutes } from "./routes/tokens.js";
import type { AccountsService } from "./service.js";

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export function registerAccountsRoutes(
  app: FastifyInstance,
  service: AccountsService,
  cookies: SessionCookies,
): void {
  const context = { app, service, cookies, auth: authGuard(app, service, cookies) };
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });
  authRoutes(context);
  recoveryRoutes(context);
  meRoutes(context);
  tokenRoutes(context);
}
