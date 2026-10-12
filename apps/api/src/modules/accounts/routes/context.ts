import type { FastifyInstance } from "fastify";
import type { SessionCookies } from "../cookies.js";
import type { authGuard } from "../guard.js";
import type { AccountsService } from "../service.js";

export type RouteContext = {
  app: FastifyInstance;
  service: AccountsService;
  cookies: SessionCookies;
  auth: ReturnType<typeof authGuard>;
};
